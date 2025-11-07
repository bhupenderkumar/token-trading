# Project Documentation

## Overview
This project is an advanced, modular Solana trading bot powered by FastAPI and a local LLM. It features real-time market data, automated trading decisions, and robust risk management.

## Architecture Diagram
- See `architecture.md` for a visual overview of the system components and their interactions.

## Main Flow
- The main entry point is `core/main.py`.
- The flow:
  1. **Startup:** Scheduler fetches market data every minute.
  2. **Market Data:** Data is cached and used for trading decisions.
  3. **LLM Decision:** The LLM analyzes wallet and market data, returns a trade action.
  4. **Trade Execution:** If BUY/SELL, executes via Jupiter/Orca APIs; else HOLD.
  5. **Logging & Monitoring:** All actions and metrics are logged for review.
  6. **Chat API:** Users can interact with the bot for status and info.

## Folder Guide
- `core/`: Main trading logic, orchestration, entry points
- `api/`: External API integrations (Jupiter, Orca, etc.)
- `services/`: Blockchain actions, wallet, transfers
- `utils/`: Data providers, helpers, websocket manager
- `tests/`: Unit and integration tests
- `docs/`: Documentation, architecture, API reference
- `config/`: Configuration templates, environment files
- `logs/`: Log files

## API Endpoints
- `/wallet-balance`: Get wallet balances
- `/execute-trade`: Run trading flow (market data → LLM decision → trade)
- `/chat`: Interact with the bot

## How to Extend
- Add new trading strategies in `core/`
- Integrate more APIs in `api/`
- Add new blockchain actions in `services/`
- Write tests in `tests/`

---

# Code Documentation

## Example: `core/main.py`
```python
"""
Main FastAPI entry point for the trading bot.
Handles startup, background jobs, API endpoints, and orchestrates the trading flow.
"""
from fastapi import FastAPI, HTTPException
# ...existing imports...

app = FastAPI()

@app.on_event("startup")
def startup_event():
    """Initializes and starts the background scheduler."""
    # Scheduler setup and initial market data fetch
    # ...existing code...

@app.get("/wallet-balance")
def wallet_balance():
    """Retrieves the wallet balance for SOL and specified SPL tokens."""
    # ...existing code...

@app.post("/execute-trade")
def trade_execution():
    """Runs the trading flow: fetches market data, gets LLM decision, executes trade."""
    # ...existing code...

@app.post("/chat")
def chat():
    """Handles conversational queries, fetching real-time data if necessary."""
    # ...existing code...
```

## Example: `core/advanced_trading_engine.py`
```python
"""
AdvancedTradingEngine: Core class for analyzing market data, generating trading signals, and executing trades.
Handles risk management, position tracking, and integrates with external APIs.
"""
class AdvancedTradingEngine:
    def analyze_market_and_generate_signals(...):
        """Analyze market data and generate trading signals for tokens."""
        # ...existing code...
    def execute_trading_signal(...):
        """Executes a trading signal with risk checks and updates positions."""
        # ...existing code...
```

## Example: `api/jupiter_api.py`
```python
"""
JupiterAPI: Client for interacting with Jupiter swap API on Solana.
Provides methods for getting quotes, executing swaps, and fetching token prices.
"""
class JupiterAPI:
    def get_quote(...):
        """Get a quote for a token swap from Jupiter API."""
        # ...existing code...
    def execute_jupiter_swap(...):
        """Execute a token swap using Jupiter API."""
        # ...existing code...
```

## Example: `utils/enhanced_data_provider.py`
```python
"""
EnhancedDataProvider: Aggregates market data from multiple sources (DexScreener, Birdeye, CoinGecko).
Calculates technical indicators and provides comprehensive token metrics.
"""
class EnhancedDataProvider:
    def get_comprehensive_token_data(...):
        """Get comprehensive token data from multiple sources."""
        # ...existing code...
```

---

For more details, see code comments in each file. Add your own docstrings and comments for new modules and functions.
