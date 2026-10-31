import os
from typing import Optional
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class BlockchainSettings(BaseSettings):
    # Environment & Security Modes
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    ALLOW_DEV_AUTH_HEADERS: bool = os.getenv("ALLOW_DEV_AUTH_HEADERS", "true").lower() in ("true", "1", "yes")
    WEBHOOK_SECRET: Optional[str] = os.getenv("WEBHOOK_SECRET", None)

    # RPC and Network
    POLYGON_AMOY_RPC_URL: str = os.getenv("POLYGON_AMOY_RPC_URL", "https://polygon-amoy-bor-rpc.publicnode.com")
    POLYGON_AMOY_CHAIN_ID: int = int(os.getenv("POLYGON_AMOY_CHAIN_ID", "80002"))
    TRUSTCHAIN_CONTRACT_ADDRESS: str = os.getenv("TRUSTCHAIN_CONTRACT_ADDRESS", "")
    
    # Confirmation threshold
    CONFIRMATION_BLOCKS: int = int(os.getenv("CONFIRMATION_BLOCKS", "2"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./trustchain.db")
    
    # Wallet linking nonce configuration
    NONCE_EXPIRY_SECONDS: int = int(os.getenv("NONCE_EXPIRY_SECONDS", "300"))  # 5 minutes
    APP_DOMAIN: str = os.getenv("APP_DOMAIN", "trustchain.supplychain.io")
    APP_NAME: str = "TRUSTCHAIN Disruption Recovery & Accountability"
    
    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = BlockchainSettings()
