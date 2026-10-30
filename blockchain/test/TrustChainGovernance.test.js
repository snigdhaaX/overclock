const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Category bitmask mirrors TrustChainGovernance.sol
const CAT = {
  ANALYST: 0x01,
  SCM: 0x02,
  WAREHOUSE: 0x04,
  PROCUREMENT: 0x08,
  ADMIN: 0x10,
};

const Status = {
  NONE: 0n,
  PENDING_APPROVAL: 1n,
  APPROVED: 2n,
  REJECTED: 3n,
  REVISION_REQUESTED: 4n,
  SUPERSEDED: 5n,
  EXECUTED: 6n,
};

const ORG_A = ethers.id("org:acme-logistics");
const ORG_B = ethers.id("org:globex-freight");
const PLAN_ID = ethers.encodeBytes32String("RCP-1001");
const sha = (s) => ethers.sha256(ethers.toUtf8Bytes(s));

async function deployFixture() {
  const [admin, registrar, analyst, manager, warehouse, procurement, outsider, otherOrgAnalyst] =
    await ethers.getSigners();

  const Factory = await ethers.getContractFactory("TrustChainGovernance");
  const gov = await Factory.deploy(admin.address, registrar.address);
  await gov.waitForDeployment();

  return { gov, admin, registrar, analyst, manager, warehouse, procurement, outsider, otherOrgAnalyst };
}

async function registeredFixture() {
  const ctx = await deployFixture();
  const { gov, registrar, analyst, manager, warehouse, procurement, otherOrgAnalyst } = ctx;
  await gov.connect(registrar).registerWallet(analyst.address, ORG_A, CAT.ANALYST);
  await gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.SCM);
  await gov.connect(registrar).registerWallet(warehouse.address, ORG_A, CAT.WAREHOUSE);
  await gov.connect(registrar).registerWallet(procurement.address, ORG_A, CAT.PROCUREMENT);
  await gov.connect(registrar).registerWallet(otherOrgAnalyst.address, ORG_B, CAT.ANALYST);
  return ctx;
}

describe("TrustChainGovernance — Milestone 1", function () {
  // ---------------------------------------------------------------------
  describe("Deployment & roles", function () {
    it("assigns admin, pauser and registrar roles", async function () {
      const { gov, admin, registrar } = await loadFixture(deployFixture);
      expect(await gov.hasRole(await gov.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await gov.hasRole(await gov.PAUSER_ROLE(), admin.address)).to.equal(true);
      expect(await gov.hasRole(await gov.REGISTRAR_ROLE(), registrar.address)).to.equal(true);
      expect(await gov.hasRole(await gov.REGISTRAR_ROLE(), admin.address)).to.equal(false);
    });

    it("rejects zero addresses in the constructor", async function () {
      const [admin] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("TrustChainGovernance");
      await expect(Factory.deploy(ethers.ZeroAddress, admin.address)).to.be.revertedWithCustomError(
        Factory,
        "ZeroAddress"
      );
      await expect(Factory.deploy(admin.address, ethers.ZeroAddress)).to.be.revertedWithCustomError(
        Factory,
        "ZeroAddress"
      );
    });

    it("does not give the administrator automatic approval or creation authority", async function () {
      const { gov, admin, registrar } = await loadFixture(deployFixture);
      expect(await gov.isActiveWallet(admin.address)).to.equal(false);
      expect(await gov.isActiveWallet(registrar.address)).to.equal(false);
      expect(await gov.hasCategory(admin.address, CAT.SCM)).to.equal(false);
      await expect(
        gov.connect(admin).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "WalletNotActive");
    });
  });

  // ---------------------------------------------------------------------
  describe("Wallet registration", function () {
    it("[T1] authorised registrar registers a wallet and emits WalletRegistered", async function () {
      const { gov, registrar, manager } = await loadFixture(deployFixture);
      await expect(gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.SCM))
        .to.emit(gov, "WalletRegistered")
        .withArgs(manager.address, ORG_A, CAT.SCM, registrar.address);

      const w = await gov.getWallet(manager.address);
      expect(w.orgId).to.equal(ORG_A);
      expect(w.categories).to.equal(CAT.SCM);
      expect(w.active).to.equal(true);
      expect(w.registeredAt).to.be.greaterThan(0n);
      expect(await gov.hasCategory(manager.address, CAT.SCM)).to.equal(true);
      expect(await gov.hasCategory(manager.address, CAT.PROCUREMENT)).to.equal(false);
    });

    it("supports multiple categories on one wallet", async function () {
      const { gov, registrar, manager } = await loadFixture(deployFixture);
      await gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.SCM | CAT.PROCUREMENT);
      expect(await gov.hasCategory(manager.address, CAT.SCM)).to.equal(true);
      expect(await gov.hasCategory(manager.address, CAT.PROCUREMENT)).to.equal(true);
      expect(await gov.hasCategory(manager.address, CAT.WAREHOUSE)).to.equal(false);
    });

    it("[T2] unauthorised account cannot register a wallet", async function () {
      const { gov, outsider, manager } = await loadFixture(deployFixture);
      await expect(gov.connect(outsider).registerWallet(manager.address, ORG_A, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, await gov.REGISTRAR_ROLE());
    });

    it("admin without REGISTRAR_ROLE cannot register a wallet", async function () {
      const { gov, admin, manager } = await loadFixture(deployFixture);
      await expect(
        gov.connect(admin).registerWallet(manager.address, ORG_A, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
    });

    it("blocks registrar self-registration (privilege escalation)", async function () {
      const { gov, registrar } = await loadFixture(deployFixture);
      await expect(gov.connect(registrar).registerWallet(registrar.address, ORG_A, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "SelfRegistrationForbidden")
        .withArgs(registrar.address);
    });

    it("blocks registrar self-update of categories", async function () {
      const { gov, admin, registrar, manager } = await loadFixture(deployFixture);
      // Give manager the registrar role and register them through another registrar
      await gov.connect(admin).grantRole(await gov.REGISTRAR_ROLE(), manager.address);
      await gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.ANALYST);
      await expect(
        gov.connect(manager).updateWalletCategories(manager.address, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "SelfRegistrationForbidden");
    });

    it("validates address, organisation and categories", async function () {
      const { gov, registrar, manager } = await loadFixture(deployFixture);
      await expect(
        gov.connect(registrar).registerWallet(ethers.ZeroAddress, ORG_A, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "ZeroAddress");
      await expect(
        gov.connect(registrar).registerWallet(manager.address, ethers.ZeroHash, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "ZeroIdentifier");
      await expect(gov.connect(registrar).registerWallet(manager.address, ORG_A, 0))
        .to.be.revertedWithCustomError(gov, "InvalidCategories")
        .withArgs(0);
      await expect(gov.connect(registrar).registerWallet(manager.address, ORG_A, 0x20))
        .to.be.revertedWithCustomError(gov, "InvalidCategories")
        .withArgs(0x20);
    });

    it("prevents duplicate active registration", async function () {
      const { gov, registrar, manager } = await loadFixture(deployFixture);
      await gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.SCM);
      await expect(gov.connect(registrar).registerWallet(manager.address, ORG_B, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "WalletAlreadyActive")
        .withArgs(manager.address);
    });

    it("updates categories and emits WalletCategoriesUpdated", async function () {
      const { gov, registrar, manager } = await loadFixture(registeredFixture);
      await expect(gov.connect(registrar).updateWalletCategories(manager.address, CAT.SCM | CAT.WAREHOUSE))
        .to.emit(gov, "WalletCategoriesUpdated")
        .withArgs(manager.address, ORG_A, CAT.SCM, CAT.SCM | CAT.WAREHOUSE, registrar.address);
      expect(await gov.hasCategory(manager.address, CAT.WAREHOUSE)).to.equal(true);
    });

    it("cannot update an unregistered wallet", async function () {
      const { gov, registrar, outsider } = await loadFixture(deployFixture);
      await expect(
        gov.connect(registrar).updateWalletCategories(outsider.address, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "WalletNotActive");
    });
  });

  // ---------------------------------------------------------------------
  describe("Wallet revocation", function () {
    it("revokes a wallet and emits WalletRevoked", async function () {
      const { gov, registrar, manager } = await loadFixture(registeredFixture);
      await expect(gov.connect(registrar).revokeWallet(manager.address))
        .to.emit(gov, "WalletRevoked")
        .withArgs(manager.address, ORG_A, registrar.address);
      const w = await gov.getWallet(manager.address);
      expect(w.active).to.equal(false);
      expect(w.categories).to.equal(0);
      expect(w.revokedAt).to.be.greaterThan(0n);
      expect(await gov.hasCategory(manager.address, CAT.SCM)).to.equal(false);
    });

    it("unauthorised account cannot revoke", async function () {
      const { gov, outsider, manager } = await loadFixture(registeredFixture);
      await expect(
        gov.connect(outsider).revokeWallet(manager.address)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
    });

    it("cannot revoke an inactive wallet twice", async function () {
      const { gov, registrar, manager } = await loadFixture(registeredFixture);
      await gov.connect(registrar).revokeWallet(manager.address);
      await expect(
        gov.connect(registrar).revokeWallet(manager.address)
      ).to.be.revertedWithCustomError(gov, "WalletNotActive");
    });

    it("[T15] revoked wallet cannot anchor plans afterwards", async function () {
      const { gov, registrar, analyst } = await loadFixture(registeredFixture);
      await gov.connect(registrar).revokeWallet(analyst.address);
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("plan-v1"), sha("sim-v1"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "WalletNotActive")
        .withArgs(analyst.address);
    });

    it("a revoked wallet can be re-registered explicitly", async function () {
      const { gov, registrar, manager } = await loadFixture(registeredFixture);
      await gov.connect(registrar).revokeWallet(manager.address);
      await gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.WAREHOUSE);
      const w = await gov.getWallet(manager.address);
      expect(w.active).to.equal(true);
      expect(w.revokedAt).to.equal(0n);
      expect(w.categories).to.equal(CAT.WAREHOUSE);
    });
  });

  // ---------------------------------------------------------------------
  describe("Recovery plan anchoring", function () {
    it("[T3] authorised analyst anchors V1 and emits PlanAnchored", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      const planHash = sha("RCP-1001:v1");
      const simHash = sha("SIM-77:v1");
      const stages = CAT.SCM | CAT.PROCUREMENT;

      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, planHash, simHash, stages))
        .to.emit(gov, "PlanAnchored")
        .withArgs(PLAN_ID, 1, analyst.address, planHash, simHash, ORG_A, stages);

      const p = await gov.getPlanVersion(PLAN_ID, 1);
      expect(p.planHash).to.equal(planHash);
      expect(p.simulationHash).to.equal(simHash);
      expect(p.creator).to.equal(analyst.address);
      expect(p.orgId).to.equal(ORG_A);
      expect(p.requiredStages).to.equal(stages);
      expect(p.completedStages).to.equal(0);
      expect(p.status).to.equal(Status.PENDING_APPROVAL);
      expect(p.executionEvidenceHash).to.equal(ethers.ZeroHash);
      expect(await gov.latestVersion(PLAN_ID)).to.equal(1n);
      expect(await gov.totalAnchoredVersions()).to.equal(1n);
      expect(await gov.verifyPlanHash(PLAN_ID, 1, planHash)).to.equal(true);
    });

    it("supply chain manager may also author a plan", async function () {
      const { gov, manager } = await loadFixture(registeredFixture);
      await expect(gov.connect(manager).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.WAREHOUSE)).to.emit(
        gov,
        "PlanAnchored"
      );
    });

    it("[T4] duplicate anchoring of the same version fails", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      await gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p1"), sha("s1"), CAT.SCM);
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p1-other"), sha("s1"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "InvalidVersion")
        .withArgs(2, 1);
    });

    it("reusing a plan hash fails, even under a different plan ID", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      const h = sha("identical");
      await gov.connect(analyst).anchorPlan(PLAN_ID, 1, h, sha("s"), CAT.SCM);
      await expect(
        gov.connect(analyst).anchorPlan(ethers.encodeBytes32String("RCP-2002"), 1, h, sha("s"), CAT.SCM)
      )
        .to.be.revertedWithCustomError(gov, "PlanHashAlreadyUsed")
        .withArgs(h);
    });

    it("unregistered wallet cannot anchor", async function () {
      const { gov, outsider } = await loadFixture(registeredFixture);
      await expect(
        gov.connect(outsider).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "WalletNotActive");
    });

    it("approver-only wallets cannot author plans", async function () {
      const { gov, warehouse, procurement } = await loadFixture(registeredFixture);
      await expect(gov.connect(warehouse).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "MissingCategory")
        .withArgs(warehouse.address, CAT.ANALYST | CAT.SCM);
      await expect(
        gov.connect(procurement).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "MissingCategory");
    });

    it("rejects zero identifiers and hashes", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      const z = ethers.ZeroHash;
      await expect(gov.connect(analyst).anchorPlan(z, 1, sha("p"), sha("s"), CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "ZeroIdentifier"
      );
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, z, sha("s"), CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "ZeroIdentifier"
      );
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p"), z, CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "ZeroIdentifier"
      );
    });

    it("rejects empty or non-approval required stages", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), 0))
        .to.be.revertedWithCustomError(gov, "InvalidRequiredStages")
        .withArgs(0);
      // Analyst and Administrator are not approval stages
      await expect(
        gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.ANALYST)
      ).to.be.revertedWithCustomError(gov, "InvalidRequiredStages");
      await expect(
        gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM | CAT.ADMIN)
      ).to.be.revertedWithCustomError(gov, "InvalidRequiredStages");
    });

    it("rejects version gaps and version 0", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 0, sha("p"), sha("s"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "InvalidVersion")
        .withArgs(1, 0);
      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 2, sha("p"), sha("s"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "InvalidVersion")
        .withArgs(1, 2);
    });

    it("new version supersedes the previous one without overwriting its history", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      const h1 = sha("v1");
      const h2 = sha("v2");
      await gov.connect(analyst).anchorPlan(PLAN_ID, 1, h1, sha("s1"), CAT.SCM);

      await expect(gov.connect(analyst).anchorPlan(PLAN_ID, 2, h2, sha("s2"), CAT.SCM | CAT.WAREHOUSE))
        .to.emit(gov, "PlanSuperseded")
        .withArgs(PLAN_ID, 1, 2);

      const v1 = await gov.getPlanVersion(PLAN_ID, 1);
      const v2 = await gov.getPlanVersion(PLAN_ID, 2);
      expect(v1.planHash).to.equal(h1); // historical hash preserved
      expect(v1.status).to.equal(Status.SUPERSEDED);
      expect(v2.planHash).to.equal(h2);
      expect(v2.status).to.equal(Status.PENDING_APPROVAL);
      expect(v2.requiredStages).to.equal(CAT.SCM | CAT.WAREHOUSE);
      expect(await gov.latestVersion(PLAN_ID)).to.equal(2n);
      expect(await gov.verifyPlanHash(PLAN_ID, 1, h1)).to.equal(true);
      expect(await gov.verifyPlanHash(PLAN_ID, 2, h1)).to.equal(false);
    });

    it("another organisation cannot add versions to a plan it does not own", async function () {
      const { gov, analyst, otherOrgAnalyst } = await loadFixture(registeredFixture);
      await gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("v1"), sha("s1"), CAT.SCM);
      await expect(gov.connect(otherOrgAnalyst).anchorPlan(PLAN_ID, 2, sha("v2"), sha("s2"), CAT.SCM))
        .to.be.revertedWithCustomError(gov, "OrganisationMismatch")
        .withArgs(ORG_A, ORG_B);
    });

    it("[T16] verifyPlanHash detects a hash mismatch", async function () {
      const { gov, analyst } = await loadFixture(registeredFixture);
      await gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha('{"qty":100}'), sha("s"), CAT.SCM);
      expect(await gov.verifyPlanHash(PLAN_ID, 1, sha('{"qty":100}'))).to.equal(true);
      expect(await gov.verifyPlanHash(PLAN_ID, 1, sha('{"qty":101}'))).to.equal(false);
      expect(await gov.verifyPlanHash(PLAN_ID, 9, sha('{"qty":100}'))).to.equal(false);
    });

    it("getPlanVersion reverts for unknown versions", async function () {
      const { gov } = await loadFixture(registeredFixture);
      await expect(gov.getPlanVersion(PLAN_ID, 1))
        .to.be.revertedWithCustomError(gov, "PlanNotFound")
        .withArgs(PLAN_ID, 1);
      expect(await gov.planExists(PLAN_ID, 1)).to.equal(false);
    });
  });

  // ---------------------------------------------------------------------
  describe("Administration & pausing", function () {
    it("[T17] non-admin cannot grant roles", async function () {
      const { gov, outsider } = await loadFixture(deployFixture);
      await expect(
        gov.connect(outsider).grantRole(await gov.REGISTRAR_ROLE(), outsider.address)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
    });

    it("[T17] registrar cannot grant itself admin or pauser roles", async function () {
      const { gov, registrar } = await loadFixture(deployFixture);
      await expect(
        gov.connect(registrar).grantRole(await gov.DEFAULT_ADMIN_ROLE(), registrar.address)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
      await expect(
        gov.connect(registrar).grantRole(await gov.PAUSER_ROLE(), registrar.address)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
    });

    it("[T17] non-pauser cannot pause", async function () {
      const { gov, outsider } = await loadFixture(deployFixture);
      await expect(gov.connect(outsider).pause()).to.be.revertedWithCustomError(
        gov,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("pause blocks registration and anchoring but still allows revocation", async function () {
      const { gov, admin, registrar, analyst, outsider } = await loadFixture(registeredFixture);
      await gov.connect(admin).pause();

      await expect(
        gov.connect(registrar).registerWallet(outsider.address, ORG_A, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "EnforcedPause");
      await expect(
        gov.connect(analyst).anchorPlan(PLAN_ID, 1, sha("p"), sha("s"), CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "EnforcedPause");
      await expect(gov.connect(registrar).revokeWallet(analyst.address)).to.emit(gov, "WalletRevoked");

      await gov.connect(admin).unpause();
      await expect(gov.connect(registrar).registerWallet(outsider.address, ORG_A, CAT.SCM)).to.emit(
        gov,
        "WalletRegistered"
      );
    });

    it("admin can rotate the registrar; the old registrar loses authority", async function () {
      const { gov, admin, registrar, outsider, manager } = await loadFixture(deployFixture);
      const ROLE = await gov.REGISTRAR_ROLE();
      await gov.connect(admin).revokeRole(ROLE, registrar.address);
      await gov.connect(admin).grantRole(ROLE, outsider.address);
      await expect(
        gov.connect(registrar).registerWallet(manager.address, ORG_A, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
      await expect(gov.connect(outsider).registerWallet(manager.address, ORG_A, CAT.SCM)).to.emit(
        gov,
        "WalletRegistered"
      );
    });
  });
});
