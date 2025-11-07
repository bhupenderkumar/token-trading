"""Lightweight Mobula API client for fetching newly listed tokens.

Expose only the endpoints we currently need so the rest of the codebase can
stay minimal. Focuses on the Pulse API for newly listed memecoins on Solana.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class MobulaError(RuntimeError):
    """Raised when Mobula returns a non-success response."""


class MobulaClient:
    BASE_URL = "https://pulse-v2-api.mobula.io"

    def __init__(self, api_key: Optional[str] = None, timeout: float = 10.0):
        self._api_key = api_key
        self._timeout = timeout

    async def fetch_newly_listed_tokens(
        self,
        chain_id: str = "solana:solana",
        asset_mode: bool = True,
        limit: int = 100,
        offset: int = 0,
        pool_types: Optional[str] = None,
    ) -> Any:
        """Fetch newly listed tokens from the Pulse API.
        
        Args:
            chain_id: Blockchain identifier (e.g., "solana:solana")
            asset_mode: If True, returns token-centric data (vs pool-focused)
            limit: Maximum number of results per request (max 100)
            offset: Pagination offset for fetching more results
            pool_types: Optional filter for pool types (e.g., "pumpfun")
        """
        params = {
            "assetMode": "true" if asset_mode else "false",
            "chainId": chain_id,
            "limit": limit,
            "offset": offset,
        }
        
        if pool_types:
            params["poolTypes"] = pool_types

        return await self._get("/api/2/pulse", params=params)

    async def fetch_token_ohlcv(
        self,
        token_address: str,
        blockchain: str = "solana",
        timeframe: str = "1d",
        limit: int = 30,
    ) -> Any:
        """Fetch OHLCV (Open/High/Low/Close/Volume) historical data for a token.
        
        Args:
            token_address: Token contract address/mint
            blockchain: Blockchain identifier (e.g., "solana")
            timeframe: Timeframe - "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"
            limit: Number of candles to return
        """
        # Mobula uses a different base URL for market data
        base_url = "https://api.mobula.io"
        url = f"{base_url}/api/1/market/ohlcv"
        params = {
            "asset": token_address,
            "blockchain": blockchain,
            "timeframe": timeframe,
            "limit": limit,
        }
        headers = self._headers()

        logger.info("Mobula OHLCV request -> GET %s params=%s headers=%s", url, params, headers)

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=headers)

        logger.info("Mobula OHLCV response <- %s status=%s", url, response.status_code)

        if response.status_code >= 400:
            raise MobulaError(f"Mobula OHLCV request failed ({response.status_code}): {response.text}")

        payload = response.json()
        return payload.get("data", payload)

    async def fetch_token_metadata(self, token_address: str, blockchain: str = "solana") -> Any:
        """Fetch detailed token metadata and market data."""
        base_url = "https://api.mobula.io"
        url = f"{base_url}/api/1/market/data"
        params = {
            "asset": token_address,
            "blockchain": blockchain,
        }
        headers = self._headers()

        logger.info("Mobula metadata request -> GET %s params=%s headers=%s", url, params, headers)

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=headers)

        logger.info("Mobula metadata response <- %s status=%s", url, response.status_code)

        if response.status_code >= 400:
            raise MobulaError(f"Mobula metadata request failed ({response.status_code}): {response.text}")

        payload = response.json()
        return payload.get("data", payload)

    async def _get(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Any:
        url = f"{self.BASE_URL}{path}"
        headers = self._headers()
        params = params or {}

        logger.info("Mobula request -> GET %s params=%s headers=%s", url, params, headers)

        owns_client = client is None
        if owns_client:
            client = httpx.AsyncClient(timeout=self._timeout)

        try:
            response = await client.get(url, params=params, headers=headers)
        finally:
            if owns_client:
                await client.aclose()

        logger.info("Mobula response <- %s status=%s", url, response.status_code)

        if response.status_code >= 400:
            raise MobulaError(f"Mobula request failed ({response.status_code}): {response.text}")

        payload = response.json()
        return payload.get("data", payload)

    def _headers(self) -> Dict[str, str]:
        headers = {"accept": "application/json"}
        if self._api_key:
            headers["Authorization"] = self._api_key
        return headers

