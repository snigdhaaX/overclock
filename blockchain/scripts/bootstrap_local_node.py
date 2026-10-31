#!/usr/bin/env python3
"""
TRUSTCHAIN — Local Blockchain Node Bootstrapper
Ensures TrustChainGovernance smart contract is deployed on local Hardhat (Chain 31337)
and registers Analyst and Supply Chain Manager demonstration wallets.
"""
import json
import sys
import os
import subprocess
from web3 import Web3
from eth_account import Account

def bootstrap():
    rpc_url = "http://127.0.0.1:8545"
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print("  [ERROR] Cannot connect to local Hardhat node on http://127.0.0.1:8545")
        sys.exit(1)

    contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    checksum_addr = w3.to_checksum_address(contract_address)
    code = w3.eth.get_code(checksum_addr)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    # 1. If contract is not deployed, run deploy script
    if code == b"" or code == b"\x00":
        print("  Deploying TrustChainGovernance smart contract to local node...")
        subprocess.run(
            ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "localhost"],
            cwd=os.path.join(base_dir, "blockchain"),
            check=True
        )

    # 2. Check and register authorized demo wallets
    abi_path = os.path.join(base_dir, "blockchain", "artifacts", "contracts", "TrustChainGovernance.sol", "TrustChainGovernance.json")
    if not os.path.exists(abi_path):
        print(f"  [ERROR] ABI artifact not found at {abi_path}")
        sys.exit(1)

    with open(abi_path, "r", encoding="utf-8") as f:
        abi = json.load(f)["abi"]

    contract = w3.eth.contract(address=checksum_addr, abi=abi)
    deployer = Account.from_key("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    analyst_addr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    scm_addr = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    org_bytes = w3.to_bytes(text="ORG-APEX-GLOBAL").ljust(32, b"\0")

    def send_tx(tx_func):
        tx = tx_func.build_transaction({
            "from": deployer.address,
            "nonce": w3.eth.get_transaction_count(deployer.address),
            "gas": 300000,
            "gasPrice": w3.to_wei("1", "gwei")
        })
        signed = w3.eth.account.sign_transaction(tx, deployer.key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)

    # Register Analyst (Category 0x01 = Electronics)
    if not contract.functions.isActiveWallet(analyst_addr).call():
        send_tx(contract.functions.registerWallet(analyst_addr, org_bytes, 0x01))
        print(f"  ✓ Registered Analyst wallet ({analyst_addr}) with category 0x01")
    else:
        print(f"  ✓ Analyst wallet ({analyst_addr}) already registered")

    # Register Supply Chain Manager (Category 0x02 = Logistics)
    if not contract.functions.isActiveWallet(scm_addr).call():
        send_tx(contract.functions.registerWallet(scm_addr, org_bytes, 0x02))
        print(f"  ✓ Registered SCM wallet ({scm_addr}) with category 0x02")
    else:
        print(f"  ✓ SCM wallet ({scm_addr}) already registered")

if __name__ == "__main__":
    bootstrap()

