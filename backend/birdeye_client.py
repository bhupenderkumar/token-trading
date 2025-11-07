"""Lightweight Birdeye API client for Solana wallet monitoring.

Expose only the endpoints we currently need so the rest of the codebase can
stay minimal. All helpers return the raw JSON `data` field that Birdeye wraps
its responses in, so callers can decide how to persist or reshape the payload.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class BirdeyeError(RuntimeError):
    """Raised when Birdeye returns a non-success response."""


class BirdeyeClient:
    BASE_URL = "https://public-api.birdeye.so"

    def __init__(self, api_key: Optional[str] = None, timeout: float = 10.0):
        self._api_key = api_key
        self._timeout = timeout

    async def fetch_portfolio(self, wallet: str) -> Any:
        """Return the current portfolio snapshot for a wallet."""

        return await self._get("/v1/wallet/portfolio", wallet=wallet)

    async def fetch_transactions(self, wallet: str) -> Any:
        """Return the recent transaction list for a wallet."""

        return await self._get("/v1/wallet/tx_list", wallet=wallet)

    async def fetch_pnl(self, wallet: str) -> Any:
        """Return realised/unrealised PnL information for a wallet."""

        return await self._get("/v1/wallet/pnl", wallet=wallet)

    async def fetch_ohlcv(
        self,
        token_address: str,
        type: str = "1D",
        time_from: Optional[int] = None,
        time_to: Optional[int] = None,
    ) -> Any:
        """Fetch OHLCV (Open/High/Low/Close/Volume) candlestick data for a token.
        
        Args:
            token_address: Token mint address
            type: Timeframe - "1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "6H", "8H", "12H", "1D", "3D", "1W", "1M"
            time_from: Start timestamp (Unix seconds, optional)
            time_to: End timestamp (Unix seconds, optional)
        """
        params = {"address": token_address, "type": type}
        if time_from:
            params["time_from"] = time_from
        if time_to:
            params["time_to"] = time_to
        
        return await self._get("/v1/token/ohlcv", params=params)

    async def fetch_token_price(self, token_address: str) -> Any:
        """Fetch current price and market data for a token."""
        params = {"address": token_address}
        return await self._get("/v1/token/price", params=params)

    async def fetch_wallet_snapshot(self, wallet: str) -> Dict[str, Any]:
        """Convenience helper that combines portfolio, PnL and transaction data."""

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            portfolio = await self._get("/v1/wallet/portfolio", wallet=wallet, client=client)
            pnl = await self._get("/v1/wallet/pnl", wallet=wallet, client=client)
            transactions = await self._get("/v1/wallet/tx_list", wallet=wallet, client=client)

        return {
            "wallet": wallet,
            "portfolio": portfolio,
            "pnl": pnl,
            "transactions": transactions,
        }

    async def _get(
        self,
        path: str,
        *,
        wallet: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Any:
        if params is None:
            params = {"wallet": wallet} if wallet else {}
        elif wallet and "wallet" not in params:
            params["wallet"] = wallet
        url = f"{self.BASE_URL}{path}"
        headers = self._headers()

        logger.info("Birdeye request -> GET %s params=%s headers=%s", url, params, headers)

        owns_client = client is None
        if owns_client:
            client = httpx.AsyncClient(timeout=self._timeout)

        try:
            response = await client.get(url, params=params, headers=headers)
        finally:
            if owns_client:
                await client.aclose()

        logger.info("Birdeye response <- %s status=%s", url, response.status_code)

        if response.status_code >= 400:
            raise BirdeyeError(f"Birdeye request failed ({response.status_code}): {response.text}")

        payload = response.json()
        return payload.get("data", payload)

    def _headers(self) -> Dict[str, str]:
        headers = {"accept": "application/json"}
        if self._api_key:
            headers["X-API-KEY"] = self._api_key
        return headers


