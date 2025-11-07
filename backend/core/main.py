"""
Main FastAPI entry point for the trading bot.
Handles startup, background jobs, API endpoints, and orchestrates the trading flow.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Depends, Header
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
from typing import List, Optional, Union
from datetime import datetime

from backend.enhanced_data_provider import enhanced_data_provider
from backend.advanced_trading_engine import trading_engine, TradingSignal
from backend.jupiter_api import jupiter_api
from backend.llm import get_trade_decision, get_chat_response
from backend.solana_actions import get_wallet_balance, get_enhanced_wallet_balance, execute_swap
from backend.state import update_last_trade, get_last_trade, update_market_data_cache, get_market_data_cache
from backend.logging_monitoring import comprehensive_logger
from backend.websocket_manager import websocket_manager
from backend.settings import settings
from backend.simple_trading import simple_trading_flow
import time

# Expanded list of tokens to monitor for more opportunities
TOKEN_WHITELIST = {
    "SOL": "So11111111111111111111111111111111111111112",
    # Devnet USDC and USDT mint addresses for Orca
    "USDC": "Aj4Qn5QyRvCNr4AaVgy6QF6UVxZ4WRzE7dHGtVw6VQ8y",  # USDC devnet
    "USDT": "BQ2uQ7rJk1tG7QwQvQwQwQwQwQwQwQwQwQwQwQwQwQwQw",  # USDT devnet (example, replace with actual)
    "JUP": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "JTO": "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    "PYTH": "HZ1JovNiVvGrGNiiYvEozEVgZ58AQuUn5minDDDMfG5G",
    "RAY": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    "ORCA": "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
}

# Global state for enhanced features
app_enhanced_state = {
    "trading_signals": [],
    "portfolio_metrics": {},
    "risk_alerts": [],
    "performance_history": [],
    "auto_trading_enabled": False,
    "last_signal_generation": None,
}

app = FastAPI(
    title="Advanced Cryptocurrency Trading System",
    description="Comprehensive cryptocurrency trading system with real-time data integration, automated LLM-based decision making, Jupiter API integration, and advanced risk management.",
    version="2.0.0",
)

# API Key dependency (enabled if settings.API_KEYS is non-empty)
def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    if settings.API_KEYS:
        if not x_api_key or x_api_key not in settings.API_KEYS:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True

@app.on_event("startup")
def startup_event():
    """Initializes and starts the background scheduler."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_market_data_job, 'interval', minutes=1)
    scheduler.start()
    # Run job immediately on startup
    fetch_market_data_job()

@app.get("/wallet-balance")
def wallet_balance(_auth: bool = Depends(require_api_key)):
    """Retrieves the wallet balance for SOL and specified SPL tokens."""
    try:
        return get_wallet_balance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-trade")
def trade_execution(_auth: bool = Depends(require_api_key)):
    """Runs the trading flow: fetches market data, gets LLM decision, executes trade."""
    try:
        token_addresses = list(TOKEN_WHITELIST.values())
        result = simple_trading_flow(token_addresses)
        if result.get("decision"):
            update_last_trade(result["decision"])
        return {
            "status": "success",
            "message": "Trading flow completed",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def chat(chat_message: BaseModel, _auth: bool = Depends(require_api_key)):
    """Handles conversational queries, fetching real-time data if necessary."""
    try:
        context = {"last_trade": get_last_trade()}
        context["market_data"] = get_market_data_cache()
        response = get_chat_response(chat_message.message, context)
        return {
            "user_message": chat_message.message,
            "response": response,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ...other endpoints and background jobs...
