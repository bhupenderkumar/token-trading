import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv
from trading import (
    get_token_info,
    get_transaction_history,
    airdrop_sol,
    create_token,
    airdrop_token,
    burn_token,
)

load_dotenv()

app = FastAPI(
    title="Solana Token Management API",
    description="API for managing Solana tokens.",
    version="1.0.0",
)

@app.get("/token/{mint_address}")
def read_token_info(mint_address: str):
    return get_token_info(mint_address)

@app.get("/transactions/{wallet_address}")
def read_transaction_history(wallet_address: str):
    return get_transaction_history(wallet_address)

@app.post("/airdrop-sol")
def request_airdrop_sol(wallet_address: str, amount: float):
    return airdrop_sol(wallet_address, amount)

@app.post("/create-token")
def request_create_token(name: str, symbol: str, decimals: int, supply: int):
    return create_token(name, symbol, decimals, supply)

@app.post("/airdrop-token")
def request_airdrop_token(mint_address: str, recipient_address: str, amount: int):
    return airdrop_token(mint_address, recipient_address, amount)

@app.post("/burn-token")
def request_burn_token(mint_address: str, amount: int):
    return burn_token(mint_address, amount)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
