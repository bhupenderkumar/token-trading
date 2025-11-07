# LLM-Powered Solana Trading Bot

## Project Structure (2025 Refactor)

```
backend/
├── core/         # Main trading logic, orchestration, entry points
│   ├── advanced_trading_engine.py
│   ├── main.py
│   ├── mobula.py
│   ├── simple_trading.py
│   ├── state.py
│   ├── logging_monitoring.py
│   ├── llm.py
│   └── __init__.py
├── api/          # External API integrations (Jupiter, Orca, etc.)
│   ├── jupiter_api.py
│   ├── orca_api.py
│   └── __init__.py
├── services/     # Blockchain actions, wallet, transfers
│   ├── direct_sol_transfer.py
│   ├── solana_actions.py
│   └── __init__.py
├── utils/        # Data providers, helpers, websocket manager
│   ├── enhanced_data_provider.py
│   ├── data_provider.py
│   ├── websocket_manager.py
│   └── __init__.py
├── tests/        # Unit and integration tests
│   └── __init__.py
├── docs/         # Documentation, architecture, API reference
│   └── README.md
├── config/       # Configuration templates, environment files
│   └── README.md
├── requirements.txt
├── wallet.json
├── logs/         # Log files
│   └── ...
├── .env
├── .gitignore
├── README.md
└── SIMPLE_TRADING_README.md
```

### Folder Purposes
- **core/**: Main trading engine, orchestration, entry points, state, logging, LLM logic
- **api/**: External API clients (Jupiter, Orca, etc.)
- **services/**: Blockchain actions, wallet, transfers
- **utils/**: Data providers, helpers, websocket manager
- **tests/**: Unit and integration tests
- **docs/**: Documentation, architecture, API reference
- **config/**: Configuration templates, environment files
- **logs/**: Log files

---

# LLM-Powered Solana Trading Bot

This application is a FastAPI-based trading bot that uses a local LLM to make trading decisions on the Solana blockchain. It features a background job that periodically fetches live market data from Dexscreener, allowing the LLM to make informed, real-time decisions.

## Core Features

*   **Live Market Data:** A background scheduler runs every minute to fetch and cache live market data from the Dexscreener API.
*   **LLM-based Decisions:** Uses a local LLM (via Ollama) to analyze wallet balance and cached market data to make `BUY`, `SELL`, or `HOLD` decisions.
*   **Solana Integration:** Interacts with the Solana blockchain to get wallet balances.
*   **Mocked Trade Execution:** Trade execution is currently mocked to allow for safe testing of the decision-making logic without performing real transactions.
*   **Conversational Chat:** A chat endpoint allows users to interact with the bot.

## Setup

1.  **Install Dependencies:**
    ```bash
    pip3 install -r requirements.txt
    ```

2.  **Configure Environment:**
    Create a `.env` file in the `backend` directory and populate it with your credentials:
    ```
    SOLANA_NETWORK="devnet"
    PRIVATE_KEY="your_solana_private_key_in_base58"
    ```
    *Note: The `PRIVATE_KEY` must be a Base58 encoded string.*

3.  **Run the Application:**
    Make sure you have a local Ollama instance running. Then, run the FastAPI server:
    ```bash
    python3 -m uvicorn backend.main:app --reload --port 8001
    ```
    The application will be available at `http://127.0.0.1:8001`.

## API Testing

Use the following `curl` commands to test the endpoints.

### Get Wallet Balance
```bash
# Test fetching wallet balance
curl -X GET http://127.0.0.1:8001/wallet-balance
```

### Execute a Trade
This endpoint uses the cached market data, asks the LLM for a decision, and executes a swap if the decision is to BUY or SELL.

*Note: On first run, this may return a 503 error if the market data cache has not been populated yet. Wait a minute and try again.*
```bash
# Test the full trade execution cycle
curl -X POST http://127.0.0.1:8001/execute-trade -H "Content-Type: application/json"
```

### Chat with the Bot
Interact with the bot for information or to check its status.
```bash
# Test the chat functionality (market data query)
curl -X POST http://127.0.0.1:8001/chat \
-H "Content-Type: application/json" \
-d '{"message": "What is the current price of Jupiter token?"}'

# Test the chat functionality (last action query)
curl -X POST http://127.0.0.1:8001/chat \
-H "Content-Type: application/json" \
-d '{"message": "What was your last action?"}'
```
