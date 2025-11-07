import json
import requests
from backend.settings import settings

def get_trade_decision(context: dict) -> dict:
    """
    Constructs a prompt and gets a trade decision from the local LLM.
    """
    system_prompt = """
    You are a cautious Solana DeFi analyst. Your goal is to make informed, low-risk trading decisions by analyzing a broad set of market data.
    You must return a JSON object with the following structure:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "token_address": "string",
      "amount_sol": "float",
      "reasoning": "A concise explanation of the trade rationale, considering market data and risk."
    }
    Analyze the user's portfolio, balance, and the entire provided market data cache to identify the single best trading opportunity right now.
    - If you decide to BUY, specify the token_address and the amount_sol to spend.
    - If you decide to SELL, specify the token_address of a token from the holdings and the amount_sol to receive.
    - If you decide to HOLD, token_address can be null and amount_sol should be 0.
    - Your reasoning should compare potential opportunities and justify why the chosen trade is the most optimal one at this moment. Be conservative.
    """

    user_prompt = f"""
    Here is the current context:
    - SOL Balance: {context.get('sol_balance', 'N/A')}
    - Token Holdings: {json.dumps(context.get('tokens', []), indent=2)}
    - Market Data: {json.dumps(context.get('market_data', {}), indent=2)}

    Based on this, what is your trade decision?
    """

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "format": "json"
    }

    try:
        response = requests.post(settings.OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        response_data = response.json()
        decision_str = response_data.get("message", {}).get("content", "{}")
        return json.loads(decision_str)
    except (requests.RequestException, json.JSONDecodeError) as e:
        print(f"Error getting trade decision from LLM: {e}")
        return {
            "decision": "HOLD",
            "token_address": None,
            "amount_sol": 0,
            "reasoning": f"Error occurred during LLM call: {e}",
        }

def get_chat_response(message: str, context: dict) -> str:
    """
    Gets a conversational response from the local LLM, including context if relevant.
    """
    system_prompt = "You are a helpful assistant for a Solana trading bot. Be friendly and informative."

    user_prompt = f"""
    The user says: "{message}"

    Here is some real-time context you might find useful:
    - Last Trade: {json.dumps(context.get('last_trade', 'N/A'), indent=2)}
    - Wallet Balance: {json.dumps(context.get('wallet_balance', 'N/A'), indent=2)}
    - Market Data: {json.dumps(context.get('market_data', {}), indent=2)}

    Please provide a helpful and concise response.
    """

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False
    }

    try:
        response = requests.post(settings.OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        response_data = response.json()
        return response_data.get("message", {}).get("content", "")
    except (requests.RequestException, json.JSONDecodeError) as e:
        print(f"Error getting chat response from LLM: {e}")
        return "Sorry, I encountered an error trying to process your request."

def get_trading_recommendations_from_newly_listed(tokens_data: list, max_recommendations: int = 5) -> dict:
    """
    Analyzes newly listed tokens from Mobula and gets trading recommendations from the local LLM.
    
    Args:
        tokens_data: List of token dictionaries from Mobula Pulse API
        max_recommendations: Maximum number of tokens to recommend
    
    Returns:
        Dictionary with recommendations and reasoning
    """
    system_prompt = """
    You are an expert Solana DeFi analyst specializing in identifying high-potential newly listed memecoins.
    Your goal is to analyze newly listed tokens and recommend the best trading opportunities.
    
    You must return a JSON object with the following structure:
    {
      "recommendations": [
        {
          "token_address": "string",
          "token_name": "string",
          "token_symbol": "string",
          "recommendation": "STRONG_BUY" | "BUY" | "WATCH" | "AVOID",
          "confidence_score": 0-100,
          "reasoning": "Detailed analysis of why this token is recommended, including liquidity, volume, holder count, price action, and risk factors",
          "key_metrics": {
            "liquidity_usd": "number or null",
            "price_usd": "number or null",
            "volume_24h": "number or null",
            "holders": "number or null"
          }
        }
      ],
      "summary": "Overall market analysis and general trading strategy recommendations",
      "risk_warning": "Important risk considerations for trading newly listed tokens"
    }
    
    Analyze each token based on:
    - Liquidity (higher is better, but beware of pump-and-dump schemes)
    - Trading volume (organic volume is a positive sign)
    - Holder count and distribution
    - Price action and market cap
    - Social presence and community engagement
    - Security metrics (if available)
    
    Be conservative and prioritize tokens with:
    1. Substantial liquidity (>$50k USD)
    2. Organic trading volume
    3. Growing holder base
    4. Reasonable price action (not extreme pumps)
    
    Rank recommendations by potential and risk-adjusted returns.
    """

    # Format tokens data for the prompt (limit to top 50 to avoid token limits)
    formatted_tokens = tokens_data[:50] if len(tokens_data) > 50 else tokens_data
    
    user_prompt = f"""
    I have fetched {len(tokens_data)} newly listed tokens on Solana. Here is the data:
    
    {json.dumps(formatted_tokens, indent=2)}
    
    Please analyze these tokens and provide your top {max_recommendations} trading recommendations.
    Focus on tokens with strong fundamentals, good liquidity, and organic trading activity.
    Be very cautious about tokens that look like pump-and-dump schemes or have suspicious patterns.
    
    What are your trading recommendations?
    """

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "format": "json"
    }

    try:
        response = requests.post(settings.OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        response_data = response.json()
        decision_str = response_data.get("message", {}).get("content", "{}")
        
        # Try to parse as JSON
        try:
            return json.loads(decision_str)
        except json.JSONDecodeError:
            # If JSON parsing fails, return a structured response with the raw text
            return {
                "recommendations": [],
                "summary": decision_str,
                "raw_response": decision_str,
                "error": "LLM response was not valid JSON, returning raw text"
            }
    except requests.RequestException as e:
        print(f"Error getting trading recommendations from LLM: {e}")
        return {
            "recommendations": [],
            "summary": f"Error occurred during LLM call: {e}",
            "error": str(e)
        }
    except json.JSONDecodeError as e:
        print(f"Error parsing LLM response as JSON: {e}")
        return {
            "recommendations": [],
            "summary": "Error parsing LLM response",
            "error": str(e)
        }

def analyze_ohlcv_data(token_address: str, token_name: str, ohlcv_data: dict) -> dict:
    """
    Analyzes OHLCV (Open/High/Low/Close/Volume) data for a token using LLM.
    
    Args:
        token_address: Token mint address
        token_name: Token name/symbol
        ohlcv_data: OHLCV data from API (candlestick data)
    
    Returns:
        Dictionary with trading analysis and recommendations
    """
    system_prompt = """
    You are an expert technical analyst specializing in candlestick/OHLCV analysis for cryptocurrency trading.
    Your goal is to analyze OHLCV (Open/High/Low/Close/Volume) data and provide actionable trading insights.
    
    You must return a JSON object with the following structure:
    {
      "token_address": "string",
      "token_name": "string",
      "analysis": {
        "trend": "BULLISH" | "BEARISH" | "NEUTRAL" | "CONSOLIDATING",
        "strength": 0-100,
        "price_action": "Detailed description of price movement patterns",
        "volume_analysis": "Analysis of trading volume trends",
        "support_levels": ["price1", "price2"],
        "resistance_levels": ["price1", "price2"],
        "key_observations": ["observation1", "observation2"]
      },
      "trading_signal": {
        "action": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
        "confidence": 0-100,
        "entry_price": "number or null",
        "stop_loss": "number or null",
        "take_profit": "number or null",
        "reasoning": "Detailed explanation of the trading signal based on OHLCV analysis"
      },
      "risk_assessment": {
        "risk_level": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
        "volatility": "number",
        "risk_factors": ["factor1", "factor2"]
      }
    }
    
    Analyze the OHLCV data to identify:
    - Price trends and patterns (ascending, descending, consolidation)
    - Volume trends (increasing, decreasing, stable)
    - Support and resistance levels
    - Potential entry/exit points
    - Risk factors and volatility
    
    Be conservative and focus on clear patterns. If data is insufficient or unclear, recommend HOLD.
    """

    user_prompt = f"""
    I have OHLCV (candlestick) data for token: {token_name} ({token_address})
    
    OHLCV Data:
    {json.dumps(ohlcv_data, indent=2)}
    
    Please analyze this data and provide:
    1. Trend analysis (bullish/bearish/neutral)
    2. Trading signal with entry/exit points
    3. Risk assessment
    4. Key support and resistance levels
    
    What is your trading recommendation based on this OHLCV analysis?
    """

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "format": "json"
    }

    try:
        response = requests.post(settings.OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        response_data = response.json()
        decision_str = response_data.get("message", {}).get("content", "{}")
        
        try:
            return json.loads(decision_str)
        except json.JSONDecodeError:
            return {
                "token_address": token_address,
                "token_name": token_name,
                "analysis": {},
                "trading_signal": {"action": "HOLD", "reasoning": decision_str},
                "error": "LLM response was not valid JSON"
            }
    except requests.RequestException as e:
        print(f"Error analyzing OHLCV data with LLM: {e}")
        return {
            "token_address": token_address,
            "token_name": token_name,
            "analysis": {},
            "trading_signal": {"action": "HOLD", "reasoning": f"Error: {e}"},
            "error": str(e)
        }
