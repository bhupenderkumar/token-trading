"""
Simple Trading System
Flow: Get Data → LLM Decision → Execute Trade
Uses Jupiter API for both data and execution
"""
import json
import requests
from typing import Dict, Optional, List
from backend.settings import settings
from backend.jupiter_api import jupiter_api, execute_jupiter_swap
from backend.solana_actions import get_wallet_balance
from solana.rpc.api import Client
from solders.keypair import Keypair

SOL_MINT = "So11111111111111111111111111111111111111112"

...rest of code from simple_trading.py...
