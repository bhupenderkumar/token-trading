import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from concurrent.futures import ThreadPoolExecutor

from backend.enhanced_data_provider import enhanced_data_provider, TokenMetrics, TechnicalIndicators
from backend.jupiter_api import execute_jupiter_swap, jupiter_api
from backend.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TradeAction(Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"

@dataclass
class TradingSignal:
    """Comprehensive trading signal with confidence and risk assessment"""
    token_address: str
    action: TradeAction
    confidence: float  # 0-100
    risk_level: RiskLevel
    entry_price: float
    target_price: float
    stop_loss: float
    position_size: float  # Percentage of portfolio
    reasoning: str
    technical_score: float
    fundamental_score: float
    sentiment_score: float
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['action'] = self.action.value
        data['risk_level'] = self.risk_level.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class PortfolioPosition:
    """Portfolio position tracking"""
    token_address: str
    symbol: str
    amount: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    stop_loss: float
    take_profit: float
    entry_time: datetime
    last_updated: datetime

@dataclass
class RiskMetrics:
    """Risk assessment metrics"""
    portfolio_value: float
    total_exposure: float
    max_drawdown: float
    sharpe_ratio: float
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    var_95: float  # Value at Risk 95%
    max_position_size: float
    correlation_risk: float

class AdvancedTradingEngine:
    """
    Advanced trading engine with comprehensive risk management,
    technical analysis, and automated execution capabilities
    """
    
    def __init__(self):
        self.positions: Dict[str, PortfolioPosition] = {}
        self.trade_history: List[Dict] = []
        self.risk_limits = {
            'max_position_size': 0.15,  # 15% max per position
            'max_total_exposure': 0.8,   # 80% max total exposure
            'max_daily_loss': 0.05,      # 5% max daily loss
            'min_liquidity': 50000,      # $50k minimum liquidity
            'max_price_impact': 2.0,     # 2% max price impact
            'min_confidence': 70.0,      # 70% minimum confidence
        }
        
        # Performance tracking
        self.daily_pnl = 0.0
        self.total_pnl = 0.0
        self.max_drawdown = 0.0
        self.peak_portfolio_value = 0.0
        
        # Machine learning features (simplified)
        self.feature_weights = {
            'rsi': 0.15,
            'macd': 0.20,
            'volume': 0.15,
            'liquidity': 0.20,
            'price_momentum': 0.15,
            'market_sentiment': 0.15
        }
    
    async def analyze_market_and_generate_signals(self, token_addresses: List[str]) -> List[TradingSignal]:
        """
        Analyze market data and generate trading signals for multiple tokens
        """
        logger.info(f"Analyzing market for {len(token_addresses)} tokens...")
        
        # Get comprehensive market data
        market_data = enhanced_data_provider.get_comprehensive_token_data(token_addresses)
        
        signals = []
        
        # Analyze each token in parallel
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for address in token_addresses:
                if address in market_data:
                    future = executor.submit(
                        self._analyze_token_and_generate_signal,
                        address,
                        market_data[address]
                    )
                    futures.append(future)
            
            # Collect results
            for future in futures:
                try:
                    signal = future.result()
                    if signal:
                        signals.append(signal)
                except Exception as e:
                    logger.error(f"Error analyzing token: {e}")
        
        # Sort signals by confidence
        signals.sort(key=lambda x: x.confidence, reverse=True)
        
        logger.info(f"Generated {len(signals)} trading signals")
        return signals
    
    def _analyze_token_and_generate_signal(self, token_address: str, token_data: TokenMetrics) -> Optional[TradingSignal]:
        """
        Analyze individual token and generate trading signal
        """
        try:
            # Get technical indicators
            technical_indicators = enhanced_data_provider.calculate_technical_indicators(token_address)
            
            if not technical_indicators:
                return None
            
            # Calculate scores
            technical_score = self._calculate_technical_score(token_data, technical_indicators)
            fundamental_score = self._calculate_fundamental_score(token_data)
            sentiment_score = self._calculate_sentiment_score(token_data)
            
            # Overall confidence
            confidence = (technical_score * 0.4 + fundamental_score * 0.35 + sentiment_score * 0.25)
            
            # Determine action
            action = self._determine_trading_action(technical_score, fundamental_score, sentiment_score)
            
            # Risk assessment
            risk_level = self._assess_risk_level(token_data, technical_indicators)
            
            # Calculate position sizing
            position_size = self._calculate_position_size(confidence, risk_level, token_data)
            
            # Price targets
            entry_price = token_data.price_usd
            target_price, stop_loss = self._calculate_price_targets(
                entry_price, action, technical_indicators, risk_level
            )
            
            # Generate reasoning
            reasoning = self._generate_reasoning(
                action, technical_score, fundamental_score, sentiment_score, token_data
            )
            
            return TradingSignal(
                token_address=token_address,
                action=action,
                confidence=confidence,
                risk_level=risk_level,
                entry_price=entry_price,
                target_price=target_price,
                stop_loss=stop_loss,
                position_size=position_size,
                reasoning=reasoning,
                technical_score=technical_score,
                fundamental_score=fundamental_score,
                sentiment_score=sentiment_score,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error analyzing token {token_address}: {e}")
            return None
    
    def _calculate_technical_score(self, token_data: TokenMetrics, indicators: TechnicalIndicators) -> float:
        """Calculate technical analysis score (0-100)"""
        score = 50.0  # Neutral baseline
        
        # RSI analysis
        if indicators.rsi < 30:
            score += 15  # Oversold - bullish
        elif indicators.rsi > 70:
            score -= 15  # Overbought - bearish
        elif 40 <= indicators.rsi <= 60:
            score += 5   # Neutral zone - slightly positive
        
        # MACD analysis
        if indicators.macd > indicators.macd_signal and indicators.macd_histogram > 0:
            score += 10  # Bullish momentum
        elif indicators.macd < indicators.macd_signal and indicators.macd_histogram < 0:
            score -= 10  # Bearish momentum
        
        # Moving average analysis
        current_price = token_data.price_usd
        if current_price > indicators.sma_20 > indicators.sma_50:
            score += 15  # Strong uptrend
        elif current_price < indicators.sma_20 < indicators.sma_50:
            score -= 15  # Strong downtrend
        
        # Bollinger Bands analysis
        bb_position = (current_price - indicators.bb_lower) / (indicators.bb_upper - indicators.bb_lower)
        if bb_position < 0.2:
            score += 8   # Near lower band - potential bounce
        elif bb_position > 0.8:
            score -= 8   # Near upper band - potential reversal
        
        # Volume analysis
        if token_data.volume_change_24h > 50:
            score += 5   # High volume increase
        elif token_data.volume_change_24h < -30:
            score -= 5   # Volume decline
        
        return max(0, min(100, score))
    
    def _calculate_fundamental_score(self, token_data: TokenMetrics) -> float:
        """Calculate fundamental analysis score (0-100)"""
        score = 50.0  # Neutral baseline
        
        # Liquidity analysis
        if token_data.liquidity_usd > 1000000:  # $1M+
            score += 15
        elif token_data.liquidity_usd > 500000:  # $500K+
            score += 10
        elif token_data.liquidity_usd < 100000:  # <$100K
            score -= 20
        
        # Volume analysis
        if token_data.volume_24h > token_data.liquidity_usd * 0.5:
            score += 10  # High volume relative to liquidity
        elif token_data.volume_24h < token_data.liquidity_usd * 0.1:
            score -= 10  # Low volume
        
        # Market cap analysis
        if token_data.market_cap > 100000000:  # $100M+
            score += 8
        elif token_data.market_cap > 10000000:  # $10M+
            score += 5
        elif token_data.market_cap < 1000000:  # <$1M
            score -= 10
        
        # Price impact analysis
        if token_data.price_impact_10k < 1.0:  # <1% impact for $10K
            score += 10
        elif token_data.price_impact_10k > 5.0:  # >5% impact
            score -= 15
        
        # Holder analysis
        if token_data.holders > 10000:
            score += 8
        elif token_data.holders > 1000:
            score += 5
        elif token_data.holders < 100:
            score -= 10
        
        return max(0, min(100, score))
    
    def _calculate_sentiment_score(self, token_data: TokenMetrics) -> float:
        """Calculate market sentiment score (0-100)"""
        score = 50.0  # Neutral baseline
        
        # Price momentum
        if token_data.price_change_24h > 10:
            score += 15
        elif token_data.price_change_24h > 5:
            score += 10
        elif token_data.price_change_24h < -10:
            score -= 15
        elif token_data.price_change_24h < -5:
            score -= 10
        
        # Buy/sell ratio
        if token_data.buy_sell_ratio > 1.5:
            score += 10  # More buyers than sellers
        elif token_data.buy_sell_ratio < 0.7:
            score -= 10  # More sellers than buyers
        
        # ATH/ATL analysis
        if token_data.ath_change > -20:  # Within 20% of ATH
            score += 5
        elif token_data.ath_change < -80:  # More than 80% down from ATH
            score += 8   # Potential recovery
        
        if token_data.atl_change > 500:  # 5x from ATL
            score += 10
        
        return max(0, min(100, score))
    
    def _determine_trading_action(self, technical_score: float, fundamental_score: float, sentiment_score: float) -> TradeAction:
        """Determine trading action based on scores"""
        overall_score = (technical_score * 0.4 + fundamental_score * 0.35 + sentiment_score * 0.25)
        
        if overall_score >= 70:
            return TradeAction.BUY
        elif overall_score <= 30:
            return TradeAction.SELL
        else:
            return TradeAction.HOLD
    
    def _assess_risk_level(self, token_data: TokenMetrics, indicators: TechnicalIndicators) -> RiskLevel:
        """Assess risk level for the trade"""
        risk_factors = 0
        
        # Liquidity risk
        if token_data.liquidity_usd < 100000:
            risk_factors += 2
        elif token_data.liquidity_usd < 500000:
            risk_factors += 1
        
        # Volatility risk
        if indicators.volatility > 20:
            risk_factors += 2
        elif indicators.volatility > 10:
            risk_factors += 1
        
        # Price impact risk
        if token_data.price_impact_10k > 5:
            risk_factors += 2
        elif token_data.price_impact_10k > 2:
            risk_factors += 1
        
        # Market cap risk
        if token_data.market_cap < 1000000:
            risk_factors += 2
        elif token_data.market_cap < 10000000:
            risk_factors += 1
        
        # Determine risk level
        if risk_factors >= 6:
            return RiskLevel.EXTREME
        elif risk_factors >= 4:
            return RiskLevel.HIGH
        elif risk_factors >= 2:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _calculate_position_size(self, confidence: float, risk_level: RiskLevel, token_data: TokenMetrics) -> float:
        """Calculate optimal position size based on confidence and risk"""
        base_size = confidence / 100 * self.risk_limits['max_position_size']
        
        # Adjust for risk level
        risk_multipliers = {
            RiskLevel.LOW: 1.0,
            RiskLevel.MEDIUM: 0.7,
            RiskLevel.HIGH: 0.4,
            RiskLevel.EXTREME: 0.2
        }
        
        adjusted_size = base_size * risk_multipliers[risk_level]
        
        # Adjust for liquidity
        if token_data.liquidity_usd < 500000:
            adjusted_size *= 0.5
        
        return min(adjusted_size, self.risk_limits['max_position_size'])
    
    def _calculate_price_targets(self, entry_price: float, action: TradeAction, indicators: TechnicalIndicators, risk_level: RiskLevel) -> Tuple[float, float]:
        """Calculate target price and stop loss"""
        if action == TradeAction.BUY:
            # Target price based on resistance levels
            target_price = max(entry_price * 1.05, indicators.resistance_level)
            
            # Stop loss based on support levels and risk
            risk_multipliers = {
                RiskLevel.LOW: 0.95,
                RiskLevel.MEDIUM: 0.97,
                RiskLevel.HIGH: 0.98,
                RiskLevel.EXTREME: 0.99
            }
            stop_loss = min(entry_price * risk_multipliers[risk_level], indicators.support_level)
            
        elif action == TradeAction.SELL:
            # Target price for selling
            target_price = min(entry_price * 0.95, indicators.support_level)
            
            # Stop loss for short positions
            risk_multipliers = {
                RiskLevel.LOW: 1.05,
                RiskLevel.MEDIUM: 1.03,
                RiskLevel.HIGH: 1.02,
                RiskLevel.EXTREME: 1.01
            }
            stop_loss = max(entry_price * risk_multipliers[risk_level], indicators.resistance_level)
            
        else:  # HOLD
            target_price = entry_price
            stop_loss = entry_price
        
        return target_price, stop_loss
    
    def _generate_reasoning(self, action: TradeAction, technical_score: float, fundamental_score: float, sentiment_score: float, token_data: TokenMetrics) -> str:
        """Generate human-readable reasoning for the trading decision"""
        reasoning_parts = []
        
        # Action explanation
        reasoning_parts.append(f"Recommended action: {action.value}")
        
        # Score breakdown
        reasoning_parts.append(f"Technical score: {technical_score:.1f}/100")
        reasoning_parts.append(f"Fundamental score: {fundamental_score:.1f}/100")
        reasoning_parts.append(f"Sentiment score: {sentiment_score:.1f}/100")
        
        # Key factors
        if token_data.liquidity_usd > 1000000:
            reasoning_parts.append("High liquidity provides good execution")
        elif token_data.liquidity_usd < 100000:
            reasoning_parts.append("Low liquidity increases execution risk")
        
        if abs(token_data.price_change_24h) > 10:
            reasoning_parts.append(f"Strong price momentum: {token_data.price_change_24h:.1f}%")
        
        if token_data.volume_24h > token_data.liquidity_usd:
            reasoning_parts.append("High trading volume indicates strong interest")
        
        return " | ".join(reasoning_parts)
    
    async def execute_trading_signal(self, signal: TradingSignal, portfolio_balance: float) -> Optional[str]:
        """
        Execute a trading signal with comprehensive risk checks
        """
        logger.info(f"Executing trading signal: {signal.action.value} {signal.token_address}")
        
        # Pre-execution risk checks
        if not self._validate_trade_execution(signal, portfolio_balance):
            logger.warning(f"Trade validation failed for {signal.token_address}")
            return None
        
        # Calculate trade amount
        trade_amount_usd = portfolio_balance * signal.position_size
        
        try:
            if signal.action == TradeAction.BUY:
                # Execute buy order
                tx_signature = await self._execute_buy_order(
                    signal.token_address,
                    trade_amount_usd,
                    signal.stop_loss
                )
                
                if tx_signature:
                    # Update position tracking
                    self._update_position(signal, trade_amount_usd, "BUY")
                    logger.info(f"Buy order executed: {tx_signature}")
                    return tx_signature
                    
            elif signal.action == TradeAction.SELL:
                # Execute sell order
                tx_signature = await self._execute_sell_order(
                    signal.token_address,
                    signal.position_size
                )
                
                if tx_signature:
                    # Update position tracking
                    self._update_position(signal, trade_amount_usd, "SELL")
                    logger.info(f"Sell order executed: {tx_signature}")
                    return tx_signature
            
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            return None
        
        return None
    
    def _validate_trade_execution(self, signal: TradingSignal, portfolio_balance: float) -> bool:
        """Validate trade before execution"""
        
        # Confidence check
        if signal.confidence < self.risk_limits['min_confidence']:
            logger.warning(f"Signal confidence {signal.confidence} below minimum {self.risk_limits['min_confidence']}")
            return False
        
        # Position size check
        trade_amount = portfolio_balance * signal.position_size
        if trade_amount < 10:  # Minimum $10 trade
            logger.warning(f"Trade amount ${trade_amount} too small")
            return False
        
        # Daily loss check
        if self.daily_pnl < -portfolio_balance * self.risk_limits['max_daily_loss']:
            logger.warning("Daily loss limit exceeded")
            return False
        
        # Total exposure check
        current_exposure = sum(pos.amount * pos.current_price for pos in self.positions.values())
        if (current_exposure + trade_amount) > portfolio_balance * self.risk_limits['max_total_exposure']:
            logger.warning("Total exposure limit would be exceeded")
            return False
        
        return True
    
    async def _execute_buy_order(self, token_address: str, amount_usd: float, stop_loss: float) -> Optional[str]:
        """Execute buy order using Jupiter"""
        try:
            # Convert USD amount to SOL (assuming SOL as base currency)
            sol_price = await self._get_sol_price()
            amount_sol = amount_usd / sol_price
            amount_lamports = int(amount_sol * 1_000_000_000)
            
            # Execute swap: SOL -> Token
            tx_signature = execute_jupiter_swap(
                input_mint="So11111111111111111111111111111111111111112",  # SOL
                output_mint=token_address,
                amount=amount_lamports,
                slippage_bps=100,  # 1% slippage
                compute_unit_price=50000  # Priority fee
            )
            
            return tx_signature
            
        except Exception as e:
            logger.error(f"Error executing buy order: {e}")
            return None
    
    async def _execute_sell_order(self, token_address: str, position_percentage: float) -> Optional[str]:
        """Execute sell order using Jupiter"""
        try:
            # Get current position
            if token_address not in self.positions:
                logger.warning(f"No position found for {token_address}")
                return None
            
            position = self.positions[token_address]
            sell_amount = position.amount * position_percentage
            
            # Execute swap: Token -> SOL
            tx_signature = execute_jupiter_swap(
                input_mint=token_address,
                output_mint="So11111111111111111111111111111111111111112",  # SOL
                amount=int(sell_amount),
                slippage_bps=100,  # 1% slippage
                compute_unit_price=50000  # Priority fee
            )
            
            return tx_signature
            
        except Exception as e:
            logger.error(f"Error executing sell order: {e}")
            return None
    
    async def _get_sol_price(self) -> float:
        """Get current SOL price in USD"""
        try:
            price_data = jupiter_api.get_price(["So11111111111111111111111111111111111111112"])
            return float(price_data.get("So11111111111111111111111111111111111111112", {}).get("price", 100))
        except:
            return 100.0  # Fallback price
    
    def _update_position(self, signal: TradingSignal, trade_amount: float, action: str):
        """Update position tracking"""
        if action == "BUY":
            if signal.token_address in self.positions:
                # Average down/up existing position
                pos = self.positions[signal.token_address]
                total_value = pos.amount * pos.entry_price + trade_amount
                total_amount = pos.amount + (trade_amount / signal.entry_price)
                pos.entry_price = total_value / total_amount
                pos.amount = total_amount
            else:
                # New position
                self.positions[signal.token_address] = PortfolioPosition(
                    token_address=signal.token_address,
                    symbol=signal.token_address[:8],  # Simplified
                    amount=trade_amount / signal.entry_price,
                    entry_price=signal.entry_price,
                    current_price=signal.entry_price,
                    unrealized_pnl=0.0,
                    unrealized_pnl_percent=0.0,
                    stop_loss=signal.stop_loss,
                    take_profit=signal.target_price,
                    entry_time=datetime.now(),
                    last_updated=datetime.now()
                )
        
        elif action == "SELL":
            if signal.token_address in self.positions:
                pos = self.positions[signal.token_address]
                pos.amount *= (1 - signal.position_size)
                if pos.amount < 0.001:  # Close position if too small
                    del self.positions[signal.token_address]
    
    def get_portfolio_summary(self) -> Dict:
        """Get comprehensive portfolio summary"""
        total_value = 0.0
        total_pnl = 0.0
        
        for position in self.positions.values():
            position_value = position.amount * position.current_price
            position_pnl = (position.current_price - position.entry_price) * position.amount
            total_value += position_value
            total_pnl += position_pnl
        
        return {
            "total_positions": len(self.positions),
            "total_value_usd": total_value,
            "total_unrealized_pnl": total_pnl,
            "daily_pnl": self.daily_pnl,
            "total_pnl": self.total_pnl,
            "max_drawdown": self.max_drawdown,
            "positions": [pos.__dict__ for pos in self.positions.values()]
        }

# Global trading engine instance
trading_engine = AdvancedTradingEngine()