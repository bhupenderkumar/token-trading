"""Minimal FastAPI service for Birdeye wallet monitoring and Mobula token discovery.

The app keeps only the essentials so we can iterate fast while still having
interactive Swagger (via FastAPI's built-in docs). The same module exposes a
`main` entry point that can be used from the command line to test the Birdeye
integration without running the HTTP server.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from backend.birdeye_client import BirdeyeClient, BirdeyeError
from backend.mobula_client import MobulaClient, MobulaError
from backend.llm import get_trading_recommendations_from_newly_listed, analyze_ohlcv_data
from backend.settings import settings

# Configure logging to show requests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Solana Trading Monitor",
    description="Track Solana wallet activity via Birdeye API and discover newly listed tokens via Mobula Pulse API.",
    version="0.1.0",
)

birdeye_client = BirdeyeClient(api_key=settings.BIRDEYE_API_KEY)
mobula_client = MobulaClient(api_key=settings.MOBULA_API_KEY)


class WalletRequest(BaseModel):
    wallet: str


class WalletListRequest(BaseModel):
    wallets: List[str]


def _transform_error(exc: Exception) -> HTTPException:
    if isinstance(exc, (BirdeyeError, MobulaError)):
        return HTTPException(status_code=502, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
async def health() -> Dict[str, str]:
    """Basic liveness probe."""

    return {"status": "ok"}


@app.get("/wallets/{wallet}/portfolio")
async def get_wallet_portfolio(wallet: str) -> Dict[str, Any]:
    try:
        portfolio = await birdeye_client.fetch_portfolio(wallet)
        return {"wallet": wallet, "portfolio": portfolio}
    except Exception as exc:  # noqa: BLE001 - bubble up nicely
        raise _transform_error(exc) from exc


@app.get("/wallets/{wallet}/pnl")
async def get_wallet_pnl(wallet: str) -> Dict[str, Any]:
    try:
        pnl = await birdeye_client.fetch_pnl(wallet)
        return {"wallet": wallet, "pnl": pnl}
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.get("/wallets/{wallet}/transactions")
async def get_wallet_transactions(wallet: str) -> Dict[str, Any]:
    try:
        transactions = await birdeye_client.fetch_transactions(wallet)
        return {"wallet": wallet, "transactions": transactions}
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.get("/wallets/{wallet}/snapshot")
async def get_wallet_snapshot(wallet: str) -> Dict[str, Any]:
    try:
        snapshot = await birdeye_client.fetch_wallet_snapshot(wallet)
        return snapshot
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.post("/wallets/snapshots")
async def get_wallet_snapshots(payload: WalletListRequest) -> Dict[str, Any]:
    wallets = [w.strip() for w in payload.wallets if w.strip()]
    if not wallets:
        raise HTTPException(status_code=400, detail="At least one wallet is required")

    try:
        snapshots = await asyncio.gather(
            *(birdeye_client.fetch_wallet_snapshot(wallet) for wallet in wallets)
        )
        return {"wallets": snapshots}
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.get("/tokens/newly-listed")
async def get_newly_listed_tokens(
    chain_id: str = Query(default="solana:solana", description="Blockchain identifier (e.g., 'solana:solana')"),
    asset_mode: bool = Query(default=True, description="Return token-centric data"),
    limit: int = Query(default=100, ge=1, le=100, description="Maximum results per request (max 100)"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    pool_types: Optional[str] = Query(default=None, description="Filter by pool types (e.g., 'pumpfun')"),
) -> Dict[str, Any]:
    """Fetch newly listed tokens/memecoins from Mobula Pulse API."""
    try:
        tokens = await mobula_client.fetch_newly_listed_tokens(
            chain_id=chain_id,
            asset_mode=asset_mode,
            limit=limit,
            offset=offset,
            pool_types=pool_types,
        )
        return {
            "chain_id": chain_id,
            "limit": limit,
            "offset": offset,
            "count": len(tokens) if isinstance(tokens, list) else 0,
            "tokens": tokens,
        }
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.get("/trading/recommendations")
async def get_trading_recommendations(
    chain_id: str = Query(default="solana:solana", description="Blockchain identifier"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of tokens to analyze (max 100)"),
    max_recommendations: int = Query(default=5, ge=1, le=10, description="Maximum number of recommendations"),
    pool_types: Optional[str] = Query(default=None, description="Filter by pool types (e.g., 'pumpfun')"),
    include_ohlcv: bool = Query(default=False, description="Fetch and analyze OHLCV data for recommended tokens"),
) -> Dict[str, Any]:
    """
    Fetch newly listed tokens from Mobula and get LLM-powered trading recommendations.
    
    This endpoint:
    1. Fetches newly listed tokens from Mobula Pulse API
    2. Sends the data to local Ollama LLM for analysis
    3. Optionally fetches OHLCV data for recommended tokens and analyzes it
    4. Returns trading recommendations with reasoning
    """
    try:
        # Step 1: Fetch newly listed tokens
        tokens = await mobula_client.fetch_newly_listed_tokens(
            chain_id=chain_id,
            asset_mode=True,
            limit=limit,
            offset=0,
            pool_types=pool_types,
        )
        
        if not tokens or (isinstance(tokens, list) and len(tokens) == 0):
            return {
                "error": "No tokens found",
                "recommendations": [],
                "summary": "No newly listed tokens available for analysis."
            }
        
        # Ensure tokens is a list
        tokens_list = tokens if isinstance(tokens, list) else [tokens]
        
        # Step 2: Get LLM recommendations
        recommendations = get_trading_recommendations_from_newly_listed(
            tokens_data=tokens_list,
            max_recommendations=max_recommendations
        )
        
        result = {
            "chain_id": chain_id,
            "tokens_analyzed": len(tokens_list),
            "recommendations": recommendations.get("recommendations", []),
            "summary": recommendations.get("summary", ""),
            "risk_warning": recommendations.get("risk_warning", ""),
        }
        
        # Step 3: Optionally fetch and analyze OHLCV data for recommended tokens
        if include_ohlcv and recommendations.get("recommendations"):
            ohlcv_analyses = []
            for rec in recommendations.get("recommendations", []):
                token_address = rec.get("token_address")
                token_name = rec.get("token_name", rec.get("token_symbol", "Unknown"))
                
                if token_address:
                    try:
                        # Try Birdeye first, fallback to Mobula
                        try:
                            ohlcv_data = await birdeye_client.fetch_ohlcv(token_address, type="1D")
                        except Exception:
                            # Fallback to Mobula
                            ohlcv_data = await mobula_client.fetch_token_ohlcv(
                                token_address, blockchain="solana", timeframe="1d", limit=30
                            )
                        
                        # Analyze OHLCV with LLM
                        ohlcv_analysis = analyze_ohlcv_data(token_address, token_name, ohlcv_data)
                        ohlcv_analyses.append({
                            "token_address": token_address,
                            "token_name": token_name,
                            "ohlcv_data": ohlcv_data,
                            "analysis": ohlcv_analysis,
                        })
                    except Exception as e:  # noqa: BLE001
                        logger.warning(f"Failed to fetch OHLCV for {token_address}: {e}")
                        ohlcv_analyses.append({
                            "token_address": token_address,
                            "token_name": token_name,
                            "error": str(e),
                        })
            
            result["ohlcv_analyses"] = ohlcv_analyses
        
        return result
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


@app.get("/tokens/{token_address}/ohlcv")
async def get_token_ohlcv(
    token_address: str,
    timeframe: str = Query(default="1D", description="Timeframe: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 3D, 1W, 1M"),
    provider: str = Query(default="birdeye", description="API provider: birdeye or mobula"),
    analyze: bool = Query(default=False, description="Analyze OHLCV data with LLM"),
) -> Dict[str, Any]:
    """
    Fetch OHLCV (Open/High/Low/Close/Volume) data for a specific token.
    Optionally analyze the data with LLM for trading signals.
    """
    try:
        if provider.lower() == "birdeye":
            ohlcv_data = await birdeye_client.fetch_ohlcv(token_address, type=timeframe)
        elif provider.lower() == "mobula":
            # Convert Birdeye timeframe to Mobula format
            mobula_timeframe = timeframe.lower().replace("h", "h").replace("d", "d").replace("m", "m")
            ohlcv_data = await mobula_client.fetch_token_ohlcv(
                token_address, blockchain="solana", timeframe=mobula_timeframe, limit=100
            )
        else:
            raise HTTPException(status_code=400, detail="Provider must be 'birdeye' or 'mobula'")
        
        result = {
            "token_address": token_address,
            "timeframe": timeframe,
            "provider": provider,
            "ohlcv_data": ohlcv_data,
        }
        
        # Optionally analyze with LLM
        if analyze:
            analysis = analyze_ohlcv_data(token_address, token_address, ohlcv_data)
            result["llm_analysis"] = analysis
        
        return result
    except Exception as exc:  # noqa: BLE001
        raise _transform_error(exc) from exc


async def fetch_and_print_snapshots(wallets: List[str]) -> None:
    """Helper used by the CLI workflow to dump snapshots to stdout."""

    snapshots = await asyncio.gather(
        *(birdeye_client.fetch_wallet_snapshot(wallet) for wallet in wallets)
    )
    print(json.dumps({"wallets": snapshots}, indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Birdeye wallet snapshots")
    parser.add_argument("wallets", nargs="+", help="Solana wallet addresses to inspect")

    args = parser.parse_args()
    try:
        asyncio.run(fetch_and_print_snapshots(args.wallets))
    except KeyboardInterrupt:  # pragma: no cover - convenience for manual runs
        pass


if __name__ == "__main__":
    main()


