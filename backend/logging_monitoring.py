import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import threading
from collections import deque, defaultdict

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/logs/trading_system.log'),
        logging.StreamHandler()
    ]
)

# Create logs directory if it doesn't exist
Path('backend/logs').mkdir(exist_ok=True)

@dataclass
class TradeLog:
    """Comprehensive trade logging structure"""
    timestamp: datetime
    trade_id: str
    action: str  # BUY, SELL, HOLD
    token_address: str
    token_symbol: str
    amount_usd: float
    price: float
    confidence: float
    risk_level: str
    transaction_signature: Optional[str]
    execution_time_ms: float
    slippage_actual: float
    gas_fee: float
    profit_loss: float
    reasoning: str
    market_conditions: Dict
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class PerformanceMetrics:
    """System performance metrics"""
    timestamp: datetime
    total_trades: int
    successful_trades: int
    failed_trades: int
    total_pnl: float
    win_rate: float
    avg_trade_duration: float
    max_drawdown: float
    sharpe_ratio: float
    portfolio_value: float
    api_response_times: Dict[str, float]
    system_uptime: float
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class RiskAlert:
    """Risk management alerts"""
    timestamp: datetime
    alert_type: str  # POSITION_SIZE, DRAWDOWN, LIQUIDITY, VOLATILITY
    severity: str    # LOW, MEDIUM, HIGH, CRITICAL
    message: str
    token_address: Optional[str]
    current_value: float
    threshold_value: float
    recommended_action: str
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

class ComprehensiveLogger:
    """
    Comprehensive logging and monitoring system for the trading platform
    """
    
    def __init__(self, max_logs: int = 10000):
        self.max_logs = max_logs
        
        # In-memory storage for recent logs
        self.trade_logs: deque = deque(maxlen=max_logs)
        self.performance_logs: deque = deque(maxlen=1000)
        self.risk_alerts: deque = deque(maxlen=500)
        self.api_logs: deque = deque(maxlen=5000)
        
        # Performance tracking
        self.api_response_times = defaultdict(list)
        self.trade_execution_times = []
        self.system_start_time = time.time()
        
        # Metrics aggregation
        self.daily_metrics = {}
        self.hourly_metrics = {}
        
        # Thread safety
        self.lock = threading.Lock()
        
        # Logger instances
        self.trade_logger = logging.getLogger('trading')
        self.performance_logger = logging.getLogger('performance')
        self.risk_logger = logging.getLogger('risk')
        self.api_logger = logging.getLogger('api')
        
        # File handlers for different log types
        self._setup_file_handlers()
    
    def _setup_file_handlers(self):
        """Setup separate file handlers for different log types"""
        handlers = {
            'trades': logging.FileHandler('backend/logs/trades.log'),
            'performance': logging.FileHandler('backend/logs/performance.log'),
            'risk': logging.FileHandler('backend/logs/risk_alerts.log'),
            'api': logging.FileHandler('backend/logs/api_calls.log')
        }
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        for handler in handlers.values():
            handler.setFormatter(formatter)
        
        self.trade_logger.addHandler(handlers['trades'])
        self.performance_logger.addHandler(handlers['performance'])
        self.risk_logger.addHandler(handlers['risk'])
        self.api_logger.addHandler(handlers['api'])
    
    def log_trade(self, trade_data: Dict):
        """Log comprehensive trade information"""
        try:
            trade_log = TradeLog(
                timestamp=datetime.now(),
                trade_id=trade_data.get('trade_id', f"trade_{int(time.time())}"),
                action=trade_data.get('action', 'UNKNOWN'),
                token_address=trade_data.get('token_address', ''),
                token_symbol=trade_data.get('token_symbol', ''),
                amount_usd=trade_data.get('amount_usd', 0.0),
                price=trade_data.get('price', 0.0),
                confidence=trade_data.get('confidence', 0.0),
                risk_level=trade_data.get('risk_level', 'UNKNOWN'),
                transaction_signature=trade_data.get('transaction_signature'),
                execution_time_ms=trade_data.get('execution_time_ms', 0.0),
                slippage_actual=trade_data.get('slippage_actual', 0.0),
                gas_fee=trade_data.get('gas_fee', 0.0),
                profit_loss=trade_data.get('profit_loss', 0.0),
                reasoning=trade_data.get('reasoning', ''),
                market_conditions=trade_data.get('market_conditions', {})
            )
            
            with self.lock:
                self.trade_logs.append(trade_log)
            
            # Log to file
            self.trade_logger.info(json.dumps(trade_log.to_dict(), indent=2))
            
            # Update metrics
            self._update_trade_metrics(trade_log)
            
        except Exception as e:
            logging.error(f"Error logging trade: {e}")
    
    def log_performance_metrics(self, metrics_data: Dict):
        """Log system performance metrics"""
        try:
            performance_metrics = PerformanceMetrics(
                timestamp=datetime.now(),
                total_trades=metrics_data.get('total_trades', 0),
                successful_trades=metrics_data.get('successful_trades', 0),
                failed_trades=metrics_data.get('failed_trades', 0),
                total_pnl=metrics_data.get('total_pnl', 0.0),
                win_rate=metrics_data.get('win_rate', 0.0),
                avg_trade_duration=metrics_data.get('avg_trade_duration', 0.0),
                max_drawdown=metrics_data.get('max_drawdown', 0.0),
                sharpe_ratio=metrics_data.get('sharpe_ratio', 0.0),
                portfolio_value=metrics_data.get('portfolio_value', 0.0),
                api_response_times=self._get_avg_api_response_times(),
                system_uptime=time.time() - self.system_start_time
            )
            
            with self.lock:
                self.performance_logs.append(performance_metrics)
            
            # Log to file
            self.performance_logger.info(json.dumps(performance_metrics.to_dict(), indent=2))
            
        except Exception as e:
            logging.error(f"Error logging performance metrics: {e}")
    
    def log_risk_alert(self, alert_data: Dict):
        """Log risk management alerts"""
        try:
            risk_alert = RiskAlert(
                timestamp=datetime.now(),
                alert_type=alert_data.get('alert_type', 'UNKNOWN'),
                severity=alert_data.get('severity', 'LOW'),
                message=alert_data.get('message', ''),
                token_address=alert_data.get('token_address'),
                current_value=alert_data.get('current_value', 0.0),
                threshold_value=alert_data.get('threshold_value', 0.0),
                recommended_action=alert_data.get('recommended_action', '')
            )
            
            with self.lock:
                self.risk_alerts.append(risk_alert)
            
            # Log to file with appropriate level
            log_level = {
                'LOW': logging.INFO,
                'MEDIUM': logging.WARNING,
                'HIGH': logging.ERROR,
                'CRITICAL': logging.CRITICAL
            }.get(risk_alert.severity, logging.INFO)
            
            self.risk_logger.log(log_level, json.dumps(risk_alert.to_dict(), indent=2))
            
        except Exception as e:
            logging.error(f"Error logging risk alert: {e}")
    
    def log_api_call(self, api_name: str, endpoint: str, response_time: float, status_code: int, error: Optional[str] = None):
        """Log API call performance and errors"""
        try:
            api_log_data = {
                'timestamp': datetime.now().isoformat(),
                'api_name': api_name,
                'endpoint': endpoint,
                'response_time_ms': response_time * 1000,
                'status_code': status_code,
                'error': error,
                'success': status_code < 400 and error is None
            }
            
            with self.lock:
                self.api_logs.append(api_log_data)
                self.api_response_times[api_name].append(response_time)
                
                # Keep only recent response times
                if len(self.api_response_times[api_name]) > 100:
                    self.api_response_times[api_name] = self.api_response_times[api_name][-100:]
            
            # Log to file
            if error:
                self.api_logger.error(json.dumps(api_log_data, indent=2))
            else:
                self.api_logger.info(json.dumps(api_log_data, indent=2))
                
        except Exception as e:
            logging.error(f"Error logging API call: {e}")
    
    def _update_trade_metrics(self, trade_log: TradeLog):
        """Update aggregated trade metrics"""
        try:
            date_key = trade_log.timestamp.date().isoformat()
            hour_key = trade_log.timestamp.replace(minute=0, second=0, microsecond=0).isoformat()
            
            # Daily metrics
            if date_key not in self.daily_metrics:
                self.daily_metrics[date_key] = {
                    'total_trades': 0,
                    'successful_trades': 0,
                    'total_pnl': 0.0,
                    'total_volume': 0.0
                }
            
            daily = self.daily_metrics[date_key]
            daily['total_trades'] += 1
            daily['total_volume'] += trade_log.amount_usd
            daily['total_pnl'] += trade_log.profit_loss
            
            if trade_log.transaction_signature:
                daily['successful_trades'] += 1
            
            # Hourly metrics
            if hour_key not in self.hourly_metrics:
                self.hourly_metrics[hour_key] = {
                    'total_trades': 0,
                    'avg_confidence': 0.0,
                    'total_volume': 0.0
                }
            
            hourly = self.hourly_metrics[hour_key]
            hourly['total_trades'] += 1
            hourly['total_volume'] += trade_log.amount_usd
            hourly['avg_confidence'] = (hourly['avg_confidence'] * (hourly['total_trades'] - 1) + trade_log.confidence) / hourly['total_trades']
            
        except Exception as e:
            logging.error(f"Error updating trade metrics: {e}")
    
    def _get_avg_api_response_times(self) -> Dict[str, float]:
        """Get average API response times"""
        avg_times = {}
        for api_name, times in self.api_response_times.items():
            if times:
                avg_times[api_name] = sum(times) / len(times)
        return avg_times
    
    def get_recent_trades(self, limit: int = 50) -> List[Dict]:
        """Get recent trade logs"""
        with self.lock:
            return [trade.to_dict() for trade in list(self.trade_logs)[-limit:]]
    
    def get_recent_alerts(self, limit: int = 20) -> List[Dict]:
        """Get recent risk alerts"""
        with self.lock:
            return [alert.to_dict() for alert in list(self.risk_alerts)[-limit:]]
    
    def get_performance_summary(self) -> Dict:
        """Get comprehensive performance summary"""
        try:
            with self.lock:
                recent_trades = list(self.trade_logs)[-100:]  # Last 100 trades
                
                if not recent_trades:
                    return {
                        'total_trades': 0,
                        'win_rate': 0.0,
                        'total_pnl': 0.0,
                        'avg_trade_size': 0.0,
                        'system_uptime_hours': (time.time() - self.system_start_time) / 3600
                    }
                
                successful_trades = [t for t in recent_trades if t.transaction_signature]
                profitable_trades = [t for t in recent_trades if t.profit_loss > 0]
                
                total_pnl = sum(t.profit_loss for t in recent_trades)
                total_volume = sum(t.amount_usd for t in recent_trades)
                
                return {
                    'total_trades': len(recent_trades),
                    'successful_trades': len(successful_trades),
                    'win_rate': len(profitable_trades) / len(recent_trades) * 100 if recent_trades else 0,
                    'total_pnl': total_pnl,
                    'avg_trade_size': total_volume / len(recent_trades) if recent_trades else 0,
                    'avg_confidence': sum(t.confidence for t in recent_trades) / len(recent_trades) if recent_trades else 0,
                    'system_uptime_hours': (time.time() - self.system_start_time) / 3600,
                    'api_performance': self._get_avg_api_response_times(),
                    'daily_metrics': dict(list(self.daily_metrics.items())[-7:]),  # Last 7 days
                    'recent_alerts': len([a for a in self.risk_alerts if a.timestamp > datetime.now() - timedelta(hours=24)])
                }
                
        except Exception as e:
            logging.error(f"Error getting performance summary: {e}")
            return {}
    
    def check_and_generate_alerts(self, portfolio_data: Dict, market_data: Dict):
        """Check conditions and generate risk alerts"""
        try:
            current_time = datetime.now()
            
            # Portfolio value alert
            portfolio_value = portfolio_data.get('total_portfolio_value_usd', 0)
            if portfolio_value < 100:  # Minimum portfolio threshold
                self.log_risk_alert({
                    'alert_type': 'PORTFOLIO_VALUE',
                    'severity': 'HIGH',
                    'message': f'Portfolio value ${portfolio_value:.2f} below minimum threshold',
                    'current_value': portfolio_value,
                    'threshold_value': 100,
                    'recommended_action': 'Consider adding funds or reducing position sizes'
                })
            
            # Check individual token risks
            for token_address, token_data in market_data.items():
                if isinstance(token_data, dict):
                    # Liquidity risk
                    liquidity = token_data.get('liquidity_usd', 0)
                    if liquidity < 50000:  # $50K minimum liquidity
                        self.log_risk_alert({
                            'alert_type': 'LIQUIDITY',
                            'severity': 'MEDIUM',
                            'message': f'Low liquidity ${liquidity:.0f} for token',
                            'token_address': token_address,
                            'current_value': liquidity,
                            'threshold_value': 50000,
                            'recommended_action': 'Avoid large positions or reduce exposure'
                        })
                    
                    # Volatility risk
                    price_change_24h = abs(token_data.get('price_change_24h', 0))
                    if price_change_24h > 50:  # >50% daily change
                        self.log_risk_alert({
                            'alert_type': 'VOLATILITY',
                            'severity': 'HIGH',
                            'message': f'High volatility {price_change_24h:.1f}% in 24h',
                            'token_address': token_address,
                            'current_value': price_change_24h,
                            'threshold_value': 50,
                            'recommended_action': 'Consider reducing position size or setting tighter stops'
                        })
            
        except Exception as e:
            logging.error(f"Error checking and generating alerts: {e}")

# Global logger instance
comprehensive_logger = ComprehensiveLogger()

# Decorator for API call logging
def log_api_call(api_name: str):
    """Decorator to automatically log API calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            error = None
            status_code = 200
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                status_code = 500
                raise
            finally:
                response_time = time.time() - start_time
                comprehensive_logger.log_api_call(
                    api_name=api_name,
                    endpoint=func.__name__,
                    response_time=response_time,
                    status_code=status_code,
                    error=error
                )
        return wrapper
    return decorator