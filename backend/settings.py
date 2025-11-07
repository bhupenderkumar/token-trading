import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load the .env file from the same directory as settings.py
dotenv_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

class Settings:
    def __init__(self):
        self.MOBULA_API_KEY: str = os.getenv("MOBULA_API_KEY", "")
        self.BIRDEYE_API_KEY: str = os.getenv("BIRDEYE_API_KEY", "")
        API_KEYS_RAW: str = os.getenv("API_KEYS", "")  # comma-separated list; if empty, auth disabled
        self.OLLAMA_API_URL: str = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        self.OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3-coder:30b")
        self.SOLANA_NETWORK: str = os.getenv("SOLANA_NETWORK", "devnet")
        self.PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
        
        if self.SOLANA_NETWORK == "mainnet-beta":
            self.SOLANA_RPC_URL = os.getenv("MAINNET_RPC_URL", "https://api.mainnet-beta.solana.com")
        else:
            self.SOLANA_RPC_URL = os.getenv("DEVNET_RPC_URL", "https://api.devnet.solana.com")
        
        self.API_KEYS = [k.strip() for k in API_KEYS_RAW.split(",") if k.strip()]

settings = Settings()
