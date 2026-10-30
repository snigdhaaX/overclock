const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ---------------------------------------------------------------------------
// Constants mirror TrustChainGovernance.sol
// ---------------------------------------------------------------------------
const CAT = { ANALYST: 0x01, SCM: 0x02, WAREHOUSE: 0x04, PROCUREMENT: 0x08, ADMIN: 0x10 };
const ACT = { WAREHOUSE: 0x01, PROCUREMENT: 0x02, REROUTE: 0x04, EXPEDITE: 0x08, REALLOCATE: 0x10 };
const Status = {
  NONE: 0n,
  PENDING_APPROVAL: 1n,
  APPROVED: 2n,
  REJECTED: 3n,
  REVISION_REQUESTED: 4n,
  SUPERSEDED: 5n,
  EXECUTED: 6n,
};
const Decision = { APPROVE: 0n, REJECT: 1n, REQUEST_REVISION: 2n };
const Elig = {
  ELIGIBLE: 0n,
  NOT_FOUND: 1n,
  NOT_CURRENT_VERSION: 2n,
  REJECTED: 3n,
  REVISION_REQUESTED: 4n,
  APPROVALS_INCOMPLETE: 5n,
  ALREADY_EXECUTED: 6n,
};

const ORG_A = ethers.id("org:acme-logistics");
const ORG_B = ethers.id("org:globex-freight");
const RCP = ethers.encodeBytes32String("RCP-1001");
const RCP2 = ethers.encodeBytes32String("RCP-1002");
const sha = (s) => ethers.sha256(ethers.toUtf8Bytes(s));
const REASON = sha("Supplier lead time exceeds SLA");

const ANCHOR_ACTIONS = "anchorPlan(bytes32,uint32,bytes32,bytes32,uint8,uint8)";
const ANCHOR_STAGES = "anchorPlan(bytes32,uint32,bytes32,bytes32,uint8)";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
async function fixture() {
  const s = await ethers.getSigners();
  const [
    admin,
    registrar,
    analyst,
    manager,
    warehouse,
    procurement,
    manager2,
    warehouse2,
    multi,
    outsider,
    otherOrgManager,
    creatorWh,
    adminCat,
  ] = s;

  const Factory = await ethers.getContractFactory("TrustChainGovernance");
  const gov = await Factory.deploy(admin.address, registrar.address);
  await gov.waitForDeployment();

  const reg = (w, org, c) => gov.connect(registrar).registerWallet(w.address, org, c);
  await reg(analyst, ORG_A, CAT.ANALYST);
  await reg(manager, ORG_A, CAT.SCM);
  await reg(warehouse, ORG_A, CAT.WAREHOUSE);
  await reg(procurement, ORG_A, CAT.PROCUREMENT);
  await reg(manager2, ORG_A, CAT.SCM);
  await reg(warehouse2, ORG_A, CAT.WAREHOUSE);
  await reg(multi, ORG_A, CAT.SCM | CAT.PROCUREMENT);
  await reg(otherOrgManager, ORG_B, CAT.SCM | CAT.WAREHOUSE | CAT.PROCUREMENT);
  await reg(creatorWh, ORG_A, CAT.ANALYST | CAT.WAREHOUSE);
  await reg(adminCat, ORG_A, CAT.ADMIN);

  /** Anchor a version via the action-based interface. */
  const anchor = (signer, planId, version, label, actions, extra = 0) =>
    gov.connect(signer)[ANCHOR_ACTIONS](planId, version, sha(label), sha(`sim:${label}`), actions, extra);

  return {
    gov,
    anchor,
    admin,
    registrar,
    analyst,
    manager,
    warehouse,
    procurement,
    manager2,
    warehouse2,
    multi,
    outsider,
    otherOrgManager,
    creatorWh,
    adminCat,
  };
}

/** RCP-1001 V1: warehouse transfer only. */
async function warehousePlanFixture() {
  const ctx = await fixture();
  await ctx.anchor(ctx.analyst, RCP, 1, "rcp1001-v1-warehouse", ACT.WAREHOUSE);
  return ctx;
}

/** RCP-1001 V1: warehouse transfer + alternative procurement (combined). */
async function combinedPlanFixture() {
  const ctx = await fixture();
  await ctx.anchor(ctx.analyst, RCP, 1, "rcp1001-v1-combined", ACT.WAREHOUSE | ACT.PROCUREMENT);
  return ctx;
}

/** Combined plan with all three stages approved. */
async function approvedCombinedFixture() {
  const ctx = await combinedPlanFixture();
  const { gov, warehouse, procurement, manager } = ctx;
  await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
  await gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT);
  await gov.connect(manager).approvePlan(RCP, 1, CAT.SCM);
  return ctx;
}

async function expectEligibility(gov, planId, version, reason) {
  const [eligible, r] = await gov.executionEligibility(planId, version);
  expect(r).to.equal(reason);
  expect(eligible).to.equal(reason === Elig.ELIGIBLE);
  expect(await gov.isExecutionEligible(planId, version)).to.equal(reason === Elig.ELIGIBLE);
}

// ===========================================================================
describe("TrustChainGovernance — Milestone 2", function () {
  // -------------------------------------------------------------------------
  describe("Action-based approval policy", function () {
    it("ships with the documented default policy", async function () {
      const { gov } = await loadFixture(fixture);
      expect(await gov.actionPolicy(ACT.WAREHOUSE)).to.equal(CAT.WAREHOUSE);
      expect(await gov.actionPolicy(ACT.PROCUREMENT)).to.equal(CAT.PROCUREMENT);
      expect(await gov.actionPolicy(ACT.REROUTE)).to.equal(CAT.SCM);
      expect(await gov.actionPolicy(ACT.EXPEDITE)).to.equal(CAT.SCM);
      expect(await gov.actionPolicy(ACT.REALLOCATE)).to.equal(CAT.SCM);
      expect(await gov.combinedActionStages()).to.equal(CAT.SCM);
      expect(await gov.explicitStagesAllowed()).to.equal(true);
    });

    it("derives different stages for different action combinations", async function () {
      const { gov } = await loadFixture(fixture);
      expect(await gov.requiredStagesForActions(ACT.WAREHOUSE)).to.equal(CAT.WAREHOUSE);
      expect(await gov.requiredStagesForActions(ACT.PROCUREMENT)).to.equal(CAT.PROCUREMENT);
      expect(await gov.requiredStagesForActions(ACT.REROUTE)).to.equal(CAT.SCM);
      // Combined plans add management sign-off
      expect(await gov.requiredStagesForActions(ACT.WAREHOUSE | ACT.PROCUREMENT)).to.equal(
        CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM
      );
      expect(await gov.requiredStagesForActions(ACT.WAREHOUSE | ACT.REROUTE)).to.equal(CAT.WAREHOUSE | CAT.SCM);
    });

    it("rejects empty or unknown action masks", async function () {
      const { gov, analyst } = await loadFixture(fixture);
      await expect(gov.requiredStagesForActions(0)).to.be.revertedWithCustomError(gov, "InvalidActions").withArgs(0);
      await expect(gov.requiredStagesForActions(0x20))
        .to.be.revertedWithCustomError(gov, "InvalidActions")
        .withArgs(0x20);
      await expect(
        gov.connect(analyst)[ANCHOR_ACTIONS](RCP, 1, sha("p"), sha("s"), 0, 0)
      ).to.be.revertedWithCustomError(gov, "InvalidActions");
    });

    it("snapshots required stages at anchoring and emits PlanActionsDeclared", async function () {
      const { gov, analyst } = await loadFixture(fixture);
      const actions = ACT.WAREHOUSE | ACT.PROCUREMENT;
      await expect(gov.connect(analyst)[ANCHOR_ACTIONS](RCP, 1, sha("c"), sha("s"), actions, 0))
        .to.emit(gov, "PlanAnchored")
        .withArgs(RCP, 1, analyst.address, sha("c"), sha("s"), ORG_A, CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM)
        .and.to.emit(gov, "PlanActionsDeclared")
        .withArgs(RCP, 1, actions);
      const p = await gov.getPlanVersion(RCP, 1);
      expect(p.actionMask).to.equal(actions);
      expect(p.requiredStages).to.equal(CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM);
      expect(await gov.pendingStages(RCP, 1)).to.equal(CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM);
    });

    it("additionalStages can only tighten the policy", async function () {
      const { gov, anchor, analyst } = await loadFixture(fixture);
      await anchor(analyst, RCP, 1, "wh+mgmt", ACT.WAREHOUSE, CAT.SCM);
      expect((await gov.getPlanVersion(RCP, 1)).requiredStages).to.equal(CAT.WAREHOUSE | CAT.SCM);
      await expect(anchor(analyst, RCP2, 1, "bad", ACT.WAREHOUSE, CAT.ANALYST))
        .to.be.revertedWithCustomError(gov, "InvalidRequiredStages")
        .withArgs(CAT.ANALYST);
    });

    it("policy admin can change policy; existing versions keep their snapshot", async function () {
      const { gov, admin, anchor, analyst } = await loadFixture(fixture);
      await anchor(analyst, RCP, 1, "before", ACT.WAREHOUSE);

      await expect(gov.connect(admin).setActionPolicy(ACT.WAREHOUSE, CAT.WAREHOUSE | CAT.SCM))
        .to.emit(gov, "ActionPolicyUpdated")
        .withArgs(ACT.WAREHOUSE, CAT.WAREHOUSE, CAT.WAREHOUSE | CAT.SCM, admin.address);

      await anchor(analyst, RCP2, 1, "after", ACT.WAREHOUSE);
      expect((await gov.getPlanVersion(RCP, 1)).requiredStages).to.equal(CAT.WAREHOUSE);
      expect((await gov.getPlanVersion(RCP2, 1)).requiredStages).to.equal(CAT.WAREHOUSE | CAT.SCM);
    });

    it("a disabled action cannot be anchored", async function () {
      const { gov, admin, anchor, analyst } = await loadFixture(fixture);
      await gov.connect(admin).setActionPolicy(ACT.EXPEDITE, 0);
      await expect(anchor(analyst, RCP, 1, "x", ACT.EXPEDITE))
        .to.be.revertedWithCustomError(gov, "ActionPolicyNotConfigured")
        .withArgs(ACT.EXPEDITE);
    });

    it("combined-action stages are configurable", async function () {
      const { gov, admin } = await loadFixture(fixture);
      await expect(gov.connect(admin).setCombinedActionStages(0))
        .to.emit(gov, "CombinedActionStagesUpdated")
        .withArgs(CAT.SCM, 0, admin.address);
      expect(await gov.requiredStagesForActions(ACT.WAREHOUSE | ACT.PROCUREMENT)).to.equal(
        CAT.WAREHOUSE | CAT.PROCUREMENT
      );
      await expect(gov.connect(admin).setCombinedActionStages(CAT.ADMIN)).to.be.revertedWithCustomError(
        gov,
        "InvalidRequiredStages"
      );
    });

    it("explicit-stage anchoring can be disabled to force policy-derived stages", async function () {
      const { gov, admin, anchor, analyst } = await loadFixture(fixture);
      await expect(gov.connect(admin).setExplicitStagesAllowed(false))
        .to.emit(gov, "ExplicitStagesAllowedUpdated")
        .withArgs(false, admin.address);
      await expect(
        gov.connect(analyst)[ANCHOR_STAGES](RCP, 1, sha("p"), sha("s"), CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "ExplicitStagesDisabled");
      await expect(anchor(analyst, RCP, 1, "ok", ACT.WAREHOUSE)).to.emit(gov, "PlanAnchored");
    });

    it("rejects malformed policy updates", async function () {
      const { gov, admin } = await loadFixture(fixture);
      await expect(gov.connect(admin).setActionPolicy(0, CAT.SCM)).to.be.revertedWithCustomError(gov, "InvalidActions");
      await expect(
        gov.connect(admin).setActionPolicy(ACT.WAREHOUSE | ACT.PROCUREMENT, CAT.SCM)
      ).to.be.revertedWithCustomError(gov, "InvalidActions");
      await expect(gov.connect(admin).setActionPolicy(0x20, CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "InvalidActions"
      );
      await expect(gov.connect(admin).setActionPolicy(ACT.WAREHOUSE, CAT.ANALYST)).to.be.revertedWithCustomError(
        gov,
        "InvalidRequiredStages"
      );
    });

    it("[M2-15] unauthorised accounts cannot change policy", async function () {
      const { gov, registrar, manager, outsider } = await loadFixture(fixture);
      const ROLE = await gov.POLICY_ADMIN_ROLE();
      for (const who of [registrar, manager, outsider]) {
        await expect(gov.connect(who).setActionPolicy(ACT.WAREHOUSE, 0))
          .to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount")
          .withArgs(who.address, ROLE);
        await expect(gov.connect(who).setCombinedActionStages(0)).to.be.revertedWithCustomError(
          gov,
          "AccessControlUnauthorizedAccount"
        );
        await expect(gov.connect(who).setExplicitStagesAllowed(false)).to.be.revertedWithCustomError(
          gov,
          "AccessControlUnauthorizedAccount"
        );
      }
    });

    it("[M2-15] registrar cannot grant itself the policy-admin role", async function () {
      const { gov, registrar } = await loadFixture(fixture);
      await expect(
        gov.connect(registrar).grantRole(await gov.POLICY_ADMIN_ROLE(), registrar.address)
      ).to.be.revertedWithCustomError(gov, "AccessControlUnauthorizedAccount");
    });
  });

  // -------------------------------------------------------------------------
  describe("Scenario: warehouse transfer only", function () {
    it("[M2-1][M2-13] warehouse approver approves; plan finalises and becomes eligible", async function () {
      const { gov, warehouse } = await loadFixture(warehousePlanFixture);
      await expectEligibility(gov, RCP, 1, Elig.APPROVALS_INCOMPLETE);

      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.emit(gov, "PlanApproved")
        .withArgs(RCP, 1, warehouse.address, CAT.WAREHOUSE, CAT.WAREHOUSE)
        .and.to.emit(gov, "PlanFinalized")
        .withArgs(RCP, 1, CAT.WAREHOUSE);

      const p = await gov.getPlanVersion(RCP, 1);
      expect(p.status).to.equal(Status.APPROVED);
      expect(p.completedStages).to.equal(CAT.WAREHOUSE);
      expect(await gov.pendingStages(RCP, 1)).to.equal(0);
      await expectEligibility(gov, RCP, 1, Elig.ELIGIBLE);
    });

    it("execution evidence is anchored and recorded on the version", async function () {
      const { gov, warehouse, analyst } = await loadFixture(warehousePlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      const evidence = sha("execution-evidence:RCP-1001:v1");

      await expect(gov.connect(analyst).anchorExecution(RCP, 1, evidence))
        .to.emit(gov, "ExecutionAnchored")
        .withArgs(RCP, 1, analyst.address, evidence);

      const p = await gov.getPlanVersion(RCP, 1);
      expect(p.status).to.equal(Status.EXECUTED);
      expect(p.executionEvidenceHash).to.equal(evidence);
      expect(p.executedBy).to.equal(analyst.address);
      expect(p.executedAt).to.be.greaterThan(0n);
      expect(await gov.evidenceHashUsed(evidence)).to.equal(true);
      await expectEligibility(gov, RCP, 1, Elig.ALREADY_EXECUTED);
    });

    it("[M2-5] supply-chain manager cannot approve a stage the plan does not require", async function () {
      const { gov, manager } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(manager).approvePlan(RCP, 1, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "StageNotRequired")
        .withArgs(CAT.SCM, CAT.WAREHOUSE);
    });
  });

  // -------------------------------------------------------------------------
  describe("Scenario: alternative procurement only", function () {
    it("procurement approver completes the only stage", async function () {
      const { gov, anchor, analyst, procurement } = await loadFixture(fixture);
      await anchor(analyst, RCP, 1, "procurement-only", ACT.PROCUREMENT);
      await expect(gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT)).to.emit(gov, "PlanFinalized");
      await expectEligibility(gov, RCP, 1, Elig.ELIGIBLE);
    });

    it("[M2-5] warehouse approver cannot approve the procurement stage", async function () {
      const { gov, anchor, analyst, warehouse } = await loadFixture(fixture);
      await anchor(analyst, RCP, 1, "procurement-only", ACT.PROCUREMENT);
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.PROCUREMENT))
        .to.be.revertedWithCustomError(gov, "MissingCategory")
        .withArgs(warehouse.address, CAT.PROCUREMENT);
    });
  });

  // -------------------------------------------------------------------------
  describe("Scenario: combined warehouse transfer + procurement", function () {
    it("[M2-12] partial approvals block execution until every stage is complete", async function () {
      const { gov, analyst, warehouse, procurement, manager } = await loadFixture(combinedPlanFixture);
      const evidence = sha("ev");

      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      expect((await gov.getPlanVersion(RCP, 1)).status).to.equal(Status.PENDING_APPROVAL);
      expect(await gov.pendingStages(RCP, 1)).to.equal(CAT.PROCUREMENT | CAT.SCM);
      await expectEligibility(gov, RCP, 1, Elig.APPROVALS_INCOMPLETE);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, evidence))
        .to.be.revertedWithCustomError(gov, "NotExecutionEligible")
        .withArgs(RCP, 1, Status.PENDING_APPROVAL);

      await gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT);
      await expectEligibility(gov, RCP, 1, Elig.APPROVALS_INCOMPLETE);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, evidence)).to.be.revertedWithCustomError(
        gov,
        "NotExecutionEligible"
      );

      await expect(gov.connect(manager).approvePlan(RCP, 1, CAT.SCM))
        .to.emit(gov, "PlanFinalized")
        .withArgs(RCP, 1, CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM);
      await expectEligibility(gov, RCP, 1, Elig.ELIGIBLE);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, evidence)).to.emit(gov, "ExecutionAnchored");
    });

    it("records the full ordered approval history", async function () {
      const { gov, warehouse, procurement, manager } = await loadFixture(approvedCombinedFixture);
      const history = await gov.getDecisions(RCP, 1);
      expect(history.length).to.equal(3);
      expect(await gov.getDecisionCount(RCP, 1)).to.equal(3n);

      const expected = [
        [warehouse.address, CAT.WAREHOUSE],
        [procurement.address, CAT.PROCUREMENT],
        [manager.address, CAT.SCM],
      ];
      expected.forEach(([actor, stage], i) => {
        expect(history[i].actor).to.equal(actor);
        expect(history[i].stage).to.equal(stage);
        expect(history[i].decision).to.equal(Decision.APPROVE);
        expect(history[i].reasonHash).to.equal(ethers.ZeroHash);
        expect(history[i].timestamp).to.be.greaterThan(0n);
      });
      expect(await gov.hasDecided(RCP, 1, warehouse.address)).to.equal(true);
    });

    it("one wallet holding several categories cannot complete several stages alone", async function () {
      const { gov, multi } = await loadFixture(combinedPlanFixture);
      await gov.connect(multi).approvePlan(RCP, 1, CAT.PROCUREMENT);
      await expect(gov.connect(multi).approvePlan(RCP, 1, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "ApproverAlreadyDecided")
        .withArgs(multi.address);
    });
  });

  // -------------------------------------------------------------------------
  describe("Separation of duties & authorisation", function () {
    it("[M2-2] unregistered wallet cannot approve", async function () {
      const { gov, outsider } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(outsider).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "WalletNotActive")
        .withArgs(outsider.address);
    });

    it("[M2-2] contract admin (no registry entry) cannot approve", async function () {
      const { gov, admin } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(admin).approvePlan(RCP, 1, CAT.WAREHOUSE)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
    });

    it("[M2-2] wallet registered with only the Administrator category cannot approve", async function () {
      const { gov, adminCat } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(adminCat).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "MissingCategory")
        .withArgs(adminCat.address, CAT.WAREHOUSE);
    });

    it("[M2-2] approver from another organisation cannot approve", async function () {
      const { gov, otherOrgManager } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(otherOrgManager).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "OrganisationMismatch")
        .withArgs(ORG_A, ORG_B);
    });

    it("[M2-3] creator cannot approve their own plan (manager-authored)", async function () {
      const { gov, anchor, manager } = await loadFixture(fixture);
      await anchor(manager, RCP, 1, "mgr-authored", ACT.REROUTE);
      await expect(gov.connect(manager).approvePlan(RCP, 1, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "CreatorCannotDecide")
        .withArgs(manager.address);
    });

    it("[M2-3] creator holding the approval category still cannot self-approve", async function () {
      const { gov, anchor, creatorWh, warehouse } = await loadFixture(fixture);
      await anchor(creatorWh, RCP, 1, "wh-authored", ACT.WAREHOUSE);
      await expect(gov.connect(creatorWh).approvePlan(RCP, 1, CAT.WAREHOUSE)).to.be.revertedWithCustomError(
        gov,
        "CreatorCannotDecide"
      );
      // An independent approver can
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE)).to.emit(gov, "PlanApproved");
    });

    it("[M2-3] creator cannot reject or request revision of their own plan", async function () {
      const { gov, anchor, manager } = await loadFixture(fixture);
      await anchor(manager, RCP, 1, "mgr-authored", ACT.REROUTE);
      await expect(gov.connect(manager).rejectPlan(RCP, 1, CAT.SCM, REASON)).to.be.revertedWithCustomError(
        gov,
        "CreatorCannotDecide"
      );
      await expect(gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON)).to.be.revertedWithCustomError(
        gov,
        "CreatorCannotDecide"
      );
    });

    it("[M2-4] duplicate approval by the same wallet fails", async function () {
      const { gov, warehouse } = await loadFixture(combinedPlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "ApproverAlreadyDecided")
        .withArgs(warehouse.address);
    });

    it("[M2-4] a second approver cannot re-approve an already completed stage", async function () {
      const { gov, warehouse, warehouse2 } = await loadFixture(combinedPlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      await expect(gov.connect(warehouse2).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "StageAlreadyApproved")
        .withArgs(CAT.WAREHOUSE);
    });

    it("[M2-5] invalid stage values are rejected", async function () {
      const { gov, multi } = await loadFixture(combinedPlanFixture);
      for (const stage of [0, CAT.ANALYST, CAT.ADMIN, CAT.SCM | CAT.PROCUREMENT, 0x80]) {
        await expect(gov.connect(multi).approvePlan(RCP, 1, stage))
          .to.be.revertedWithCustomError(gov, "InvalidStage")
          .withArgs(stage);
      }
    });

    it("[M2-6] revoked wallet cannot approve; its earlier decisions remain in history", async function () {
      const { gov, registrar, warehouse, procurement } = await loadFixture(combinedPlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      await gov.connect(registrar).revokeWallet(procurement.address);

      await expect(gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT))
        .to.be.revertedWithCustomError(gov, "WalletNotActive")
        .withArgs(procurement.address);
      await expect(gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );

      await gov.connect(registrar).revokeWallet(warehouse.address);
      const history = await gov.getDecisions(RCP, 1);
      expect(history.length).to.equal(1);
      expect(history[0].actor).to.equal(warehouse.address);
    });

    it("approving an unknown plan or version fails", async function () {
      const { gov, warehouse } = await loadFixture(warehousePlanFixture);
      await expect(gov.connect(warehouse).approvePlan(RCP2, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "PlanNotFound")
        .withArgs(RCP2, 1);
      await expect(gov.connect(warehouse).approvePlan(RCP, 2, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "PlanNotFound")
        .withArgs(RCP, 2);
    });
  });

  // -------------------------------------------------------------------------
  describe("Rejection", function () {
    it("[M2-7] authorised approver rejects with a reason hash", async function () {
      const { gov, procurement } = await loadFixture(combinedPlanFixture);
      await expect(gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON))
        .to.emit(gov, "PlanRejected")
        .withArgs(RCP, 1, procurement.address, CAT.PROCUREMENT, REASON);

      expect((await gov.getPlanVersion(RCP, 1)).status).to.equal(Status.REJECTED);
      const [d] = await gov.getDecisions(RCP, 1);
      expect(d.decision).to.equal(Decision.REJECT);
      expect(d.reasonHash).to.equal(REASON);
    });

    it("rejection requires a reason hash", async function () {
      const { gov, procurement } = await loadFixture(combinedPlanFixture);
      await expect(
        gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(gov, "ReasonRequired");
    });

    it("unauthorised wallet cannot reject", async function () {
      const { gov, outsider, warehouse } = await loadFixture(fixture).then(async (ctx) => {
        await ctx.anchor(ctx.analyst, RCP, 1, "proc", ACT.PROCUREMENT);
        return ctx;
      });
      await expect(gov.connect(outsider).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
      await expect(gov.connect(warehouse).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON)).to.be.revertedWithCustomError(
        gov,
        "MissingCategory"
      );
    });

    it("[M2-8] rejected plan cannot be executed or approved further", async function () {
      const { gov, analyst, warehouse, procurement } = await loadFixture(combinedPlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      await gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON);

      await expectEligibility(gov, RCP, 1, Elig.REJECTED);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev")))
        .to.be.revertedWithCustomError(gov, "NotExecutionEligible")
        .withArgs(RCP, 1, Status.REJECTED);
    });

    it("[M2-8] no further decisions are accepted after rejection", async function () {
      const { gov, procurement, manager } = await loadFixture(combinedPlanFixture);
      await gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON);
      await expect(gov.connect(manager).approvePlan(RCP, 1, CAT.SCM))
        .to.be.revertedWithCustomError(gov, "PlanNotPending")
        .withArgs(RCP, 1, Status.REJECTED);
      await expect(gov.connect(manager).rejectPlan(RCP, 1, CAT.SCM, REASON)).to.be.revertedWithCustomError(
        gov,
        "PlanNotPending"
      );
    });

    it("a fully approved but unexecuted plan can still be rejected and then cannot execute", async function () {
      const { gov, analyst, warehouse2 } = await loadFixture(approvedCombinedFixture);
      await expect(gov.connect(warehouse2).rejectPlan(RCP, 1, CAT.WAREHOUSE, REASON)).to.emit(gov, "PlanRejected");
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev"))).to.be.revertedWithCustomError(
        gov,
        "NotExecutionEligible"
      );
    });

    it("an executed plan cannot be rejected", async function () {
      const { gov, analyst, warehouse2 } = await loadFixture(approvedCombinedFixture);
      await gov.connect(analyst).anchorExecution(RCP, 1, sha("ev"));
      await expect(gov.connect(warehouse2).rejectPlan(RCP, 1, CAT.WAREHOUSE, REASON))
        .to.be.revertedWithCustomError(gov, "PlanNotPending")
        .withArgs(RCP, 1, Status.EXECUTED);
    });

    it("after rejection, a new version can be anchored; the rejected version stays REJECTED", async function () {
      const { gov, anchor, analyst, procurement } = await loadFixture(combinedPlanFixture);
      await gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON);
      await expect(anchor(analyst, RCP, 2, "rcp1001-v2", ACT.WAREHOUSE | ACT.PROCUREMENT)).not.to.emit(
        gov,
        "PlanSuperseded"
      );
      expect((await gov.getPlanVersion(RCP, 1)).status).to.equal(Status.REJECTED);
      expect((await gov.getPlanVersion(RCP, 2)).status).to.equal(Status.PENDING_APPROVAL);
    });
  });

  // -------------------------------------------------------------------------
  describe("Revision requests", function () {
    it("[M2-9] revision request is recorded without altering the version", async function () {
      const { gov, manager, warehouse } = await loadFixture(combinedPlanFixture);
      await gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE);
      const before = await gov.getPlanVersion(RCP, 1);

      await expect(gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON))
        .to.emit(gov, "PlanRevisionRequested")
        .withArgs(RCP, 1, manager.address, CAT.SCM, REASON);

      const after = await gov.getPlanVersion(RCP, 1);
      expect(after.status).to.equal(Status.REVISION_REQUESTED);
      expect(after.planHash).to.equal(before.planHash);
      expect(after.simulationHash).to.equal(before.simulationHash);
      expect(after.requiredStages).to.equal(before.requiredStages);
      expect(after.completedStages).to.equal(before.completedStages);

      const history = await gov.getDecisions(RCP, 1);
      expect(history.length).to.equal(2);
      expect(history[1].decision).to.equal(Decision.REQUEST_REVISION);
      expect(history[1].reasonHash).to.equal(REASON);
    });

    it("revision request requires a reason hash", async function () {
      const { gov, manager } = await loadFixture(combinedPlanFixture);
      await expect(
        gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(gov, "ReasonRequired");
    });

    it("version under revision cannot be approved or executed", async function () {
      const { gov, analyst, manager, procurement } = await loadFixture(combinedPlanFixture);
      await gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON);
      await expect(gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT))
        .to.be.revertedWithCustomError(gov, "PlanNotPending")
        .withArgs(RCP, 1, Status.REVISION_REQUESTED);
      await expectEligibility(gov, RCP, 1, Elig.REVISION_REQUESTED);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev"))).to.be.revertedWithCustomError(
        gov,
        "NotExecutionEligible"
      );
    });

    it("revision cannot be requested once a plan is fully approved", async function () {
      const { gov, warehouse2 } = await loadFixture(approvedCombinedFixture);
      await expect(gov.connect(warehouse2).requestRevision(RCP, 1, CAT.WAREHOUSE, REASON))
        .to.be.revertedWithCustomError(gov, "PlanNotPending")
        .withArgs(RCP, 1, Status.APPROVED);
    });

    it("revised plan is a new version that supersedes the one under revision", async function () {
      const { gov, anchor, analyst, manager } = await loadFixture(combinedPlanFixture);
      await gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON);
      await expect(anchor(analyst, RCP, 2, "rcp1001-v2-revised", ACT.WAREHOUSE | ACT.PROCUREMENT))
        .to.emit(gov, "PlanSuperseded")
        .withArgs(RCP, 1, 2);
      expect((await gov.getPlanVersion(RCP, 1)).status).to.equal(Status.SUPERSEDED);
      expect(await gov.getDecisionCount(RCP, 2)).to.equal(0n);
    });
  });

  // -------------------------------------------------------------------------
  describe("Version control", function () {
    it("[M2-10] a new version requires fresh approvals; approvals never carry over", async function () {
      const { gov, anchor, analyst, warehouse, procurement, manager } = await loadFixture(approvedCombinedFixture);
      await anchor(analyst, RCP, 2, "rcp1001-v2", ACT.WAREHOUSE | ACT.PROCUREMENT);

      const v1 = await gov.getPlanVersion(RCP, 1);
      const v2 = await gov.getPlanVersion(RCP, 2);
      expect(v1.status).to.equal(Status.SUPERSEDED);
      expect(v1.completedStages).to.equal(CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM); // history kept
      expect(v2.status).to.equal(Status.PENDING_APPROVAL);
      expect(v2.completedStages).to.equal(0);
      expect(await gov.getDecisionCount(RCP, 1)).to.equal(3n);
      expect(await gov.getDecisionCount(RCP, 2)).to.equal(0n);
      expect(await gov.hasDecided(RCP, 2, warehouse.address)).to.equal(false);
      await expectEligibility(gov, RCP, 2, Elig.APPROVALS_INCOMPLETE);

      // Same approvers may (and must) approve the new version again
      await gov.connect(warehouse).approvePlan(RCP, 2, CAT.WAREHOUSE);
      await gov.connect(procurement).approvePlan(RCP, 2, CAT.PROCUREMENT);
      await expect(gov.connect(manager).approvePlan(RCP, 2, CAT.SCM)).to.emit(gov, "PlanFinalized");
      await expectEligibility(gov, RCP, 2, Elig.ELIGIBLE);
    });

    it("a new version can require a different stage set than the previous one", async function () {
      const { gov, anchor, analyst } = await loadFixture(combinedPlanFixture);
      await anchor(analyst, RCP, 2, "rcp1001-v2-warehouse-only", ACT.WAREHOUSE);
      expect((await gov.getPlanVersion(RCP, 1)).requiredStages).to.equal(CAT.WAREHOUSE | CAT.PROCUREMENT | CAT.SCM);
      expect((await gov.getPlanVersion(RCP, 2)).requiredStages).to.equal(CAT.WAREHOUSE);
    });

    it("[M2-11] superseded (old) version cannot be executed even though fully approved", async function () {
      const { gov, anchor, analyst } = await loadFixture(approvedCombinedFixture);
      await expectEligibility(gov, RCP, 1, Elig.ELIGIBLE);
      await anchor(analyst, RCP, 2, "rcp1001-v2", ACT.WAREHOUSE);

      await expectEligibility(gov, RCP, 1, Elig.NOT_CURRENT_VERSION);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev")))
        .to.be.revertedWithCustomError(gov, "StaleVersion")
        .withArgs(RCP, 1, 2);
    });

    it("stale versions cannot receive approvals, rejections or revision requests", async function () {
      const { gov, anchor, analyst, warehouse, procurement, manager } = await loadFixture(combinedPlanFixture);
      await anchor(analyst, RCP, 2, "rcp1001-v2", ACT.WAREHOUSE | ACT.PROCUREMENT);
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "StaleVersion")
        .withArgs(RCP, 1, 2);
      await expect(gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON)).to.be.revertedWithCustomError(
        gov,
        "StaleVersion"
      );
      await expect(gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON)).to.be.revertedWithCustomError(
        gov,
        "StaleVersion"
      );
    });

    it("an executed plan cannot receive a new version", async function () {
      const { gov, anchor, analyst } = await loadFixture(approvedCombinedFixture);
      await gov.connect(analyst).anchorExecution(RCP, 1, sha("ev"));
      await expect(anchor(analyst, RCP, 2, "late-v2", ACT.WAREHOUSE))
        .to.be.revertedWithCustomError(gov, "PlanAlreadyExecuted")
        .withArgs(RCP, 1);
    });
  });

  // -------------------------------------------------------------------------
  describe("Execution evidence", function () {
    it("[M2-14] duplicate execution anchoring is rejected", async function () {
      const { gov, analyst, manager2 } = await loadFixture(approvedCombinedFixture);
      await gov.connect(analyst).anchorExecution(RCP, 1, sha("ev-1"));
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev-1")))
        .to.be.revertedWithCustomError(gov, "PlanAlreadyExecuted")
        .withArgs(RCP, 1);
      await expect(gov.connect(manager2).anchorExecution(RCP, 1, sha("ev-2")))
        .to.be.revertedWithCustomError(gov, "PlanAlreadyExecuted")
        .withArgs(RCP, 1);
    });

    it("[M2-14] the same evidence hash cannot be reused for another plan", async function () {
      const { gov, anchor, analyst, warehouse } = await loadFixture(approvedCombinedFixture);
      const evidence = sha("shared-evidence");
      await gov.connect(analyst).anchorExecution(RCP, 1, evidence);

      await anchor(analyst, RCP2, 1, "rcp1002-v1", ACT.WAREHOUSE);
      await gov.connect(warehouse).approvePlan(RCP2, 1, CAT.WAREHOUSE);
      await expect(gov.connect(analyst).anchorExecution(RCP2, 1, evidence))
        .to.be.revertedWithCustomError(gov, "EvidenceHashAlreadyUsed")
        .withArgs(evidence);
    });

    it("rejects zero evidence hash and unknown plans", async function () {
      const { gov, analyst } = await loadFixture(approvedCombinedFixture);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, ethers.ZeroHash)).to.be.revertedWithCustomError(
        gov,
        "ZeroIdentifier"
      );
      await expect(gov.connect(analyst).anchorExecution(RCP2, 1, sha("ev")))
        .to.be.revertedWithCustomError(gov, "PlanNotFound")
        .withArgs(RCP2, 1);
      await expectEligibility(gov, RCP2, 1, Elig.NOT_FOUND);
    });

    it("only active wallets of the owning organisation with an operational category may anchor evidence", async function () {
      const { gov, registrar, analyst, outsider, otherOrgManager, adminCat, admin } =
        await loadFixture(approvedCombinedFixture);
      const ev = sha("ev");
      await expect(gov.connect(outsider).anchorExecution(RCP, 1, ev)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
      await expect(gov.connect(admin).anchorExecution(RCP, 1, ev)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
      await expect(gov.connect(otherOrgManager).anchorExecution(RCP, 1, ev))
        .to.be.revertedWithCustomError(gov, "OrganisationMismatch")
        .withArgs(ORG_A, ORG_B);
      await expect(gov.connect(adminCat).anchorExecution(RCP, 1, ev))
        .to.be.revertedWithCustomError(gov, "MissingCategory")
        .withArgs(adminCat.address, CAT.ANALYST | CAT.SCM | CAT.WAREHOUSE | CAT.PROCUREMENT);

      await gov.connect(registrar).revokeWallet(analyst.address);
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, ev)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("Pause & administrative safety", function () {
    it("pause blocks approvals, rejections, revisions and execution anchoring", async function () {
      const { gov, admin, analyst, warehouse, procurement, manager } = await loadFixture(combinedPlanFixture);
      await gov.connect(admin).pause();
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE)).to.be.revertedWithCustomError(
        gov,
        "EnforcedPause"
      );
      await expect(gov.connect(procurement).rejectPlan(RCP, 1, CAT.PROCUREMENT, REASON)).to.be.revertedWithCustomError(
        gov,
        "EnforcedPause"
      );
      await expect(gov.connect(manager).requestRevision(RCP, 1, CAT.SCM, REASON)).to.be.revertedWithCustomError(
        gov,
        "EnforcedPause"
      );
      await expect(gov.connect(analyst).anchorExecution(RCP, 1, sha("ev"))).to.be.revertedWithCustomError(
        gov,
        "EnforcedPause"
      );
      await expect(
        gov.connect(analyst)[ANCHOR_ACTIONS](RCP2, 1, sha("p"), sha("s"), ACT.WAREHOUSE, 0)
      ).to.be.revertedWithCustomError(gov, "EnforcedPause");
    });

    it("[M2-15] policy admin role does not grant approval authority", async function () {
      const { gov, admin, anchor, analyst } = await loadFixture(fixture);
      await anchor(analyst, RCP, 1, "p", ACT.REROUTE);
      expect(await gov.hasRole(await gov.POLICY_ADMIN_ROLE(), admin.address)).to.equal(true);
      await expect(gov.connect(admin).approvePlan(RCP, 1, CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "WalletNotActive"
      );
    });

    it("[M2-15] revoking policy-admin role removes policy authority", async function () {
      const { gov, admin, manager } = await loadFixture(fixture);
      const ROLE = await gov.POLICY_ADMIN_ROLE();
      await gov.connect(admin).grantRole(ROLE, manager.address);
      await gov.connect(manager).setCombinedActionStages(0);
      await gov.connect(admin).revokeRole(ROLE, manager.address);
      await expect(gov.connect(manager).setCombinedActionStages(CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("End-to-end: RCP-1001 acceptance flow (contract layer)", function () {
    it("analyst anchors, self-approval blocked, approvals complete, execution anchored, hash verifies", async function () {
      const { gov, analyst, manager, procurement, warehouse } = await loadFixture(fixture);
      const planHash = sha("canonical-json:RCP-1001:v1");
      const simHash = sha("simulation:SIM-77");

      // 1-3. Operations Analyst anchors V1 (warehouse transfer + alternative procurement)
      await gov.connect(analyst)[ANCHOR_ACTIONS](RCP, 1, planHash, simHash, ACT.WAREHOUSE | ACT.PROCUREMENT, 0);

      // 4. Creator cannot self-approve (analyst lacks approval categories AND is creator)
      await expect(gov.connect(analyst).approvePlan(RCP, 1, CAT.SCM)).to.be.revertedWithCustomError(
        gov,
        "MissingCategory"
      );

      // 5-7. Manager, procurement and warehouse approvals complete the plan
      await gov.connect(manager).approvePlan(RCP, 1, CAT.SCM);
      await gov.connect(procurement).approvePlan(RCP, 1, CAT.PROCUREMENT);
      await expect(gov.connect(warehouse).approvePlan(RCP, 1, CAT.WAREHOUSE)).to.emit(gov, "PlanFinalized");
      expect(await gov.isExecutionEligible(RCP, 1)).to.equal(true);

      // 8-9. Execution evidence anchored
      const evidence = sha("execution-evidence:RCP-1001:v1");
      await gov.connect(analyst).anchorExecution(RCP, 1, evidence);

      // 10-14. Verification
      expect(await gov.verifyPlanHash(RCP, 1, planHash)).to.equal(true);
      expect(await gov.verifyPlanHash(RCP, 1, sha("tampered"))).to.equal(false);
      const p = await gov.getPlanVersion(RCP, 1);
      expect(p.status).to.equal(Status.EXECUTED);
      expect(p.executionEvidenceHash).to.equal(evidence);
      expect((await gov.getDecisions(RCP, 1)).length).to.equal(3);
    });
  });
});
