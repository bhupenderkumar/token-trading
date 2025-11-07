import asyncio
import json
import logging
from typing import Dict, List, Set
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol
from fastapi import WebSocket, WebSocketDisconnect
import threading
import time

from backend.enhanced_data_provider import enhanced_data_provider
from backend.advanced_trading_engine import trading_engine
from backend.logging_monitoring import comprehensive_logger

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Real-time WebSocket manager for live trading data streaming
    """
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_data: Dict[WebSocket, Dict] = {}
        self.streaming_active = False
        self.stream_thread = None
        
        # Data streams
        self.market_data_stream = {}
        self.trading_signals_stream = []
        self.portfolio_stream = {}
        self.alerts_stream = []
        
        # Stream intervals (seconds)
        self.market_data_interval = 5
        self.signals_interval = 30
        self.portfolio_interval = 10
        self.alerts_interval = 1
        
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Connect a new WebSocket client"""
        try:
            await websocket.accept()
            self.active_connections.add(websocket)
            
            self.connection_data[websocket] = {
                'client_id': client_id or f"client_{int(time.time())}",
                'connected_at': datetime.now(),
                'subscriptions': set(),
                'last_ping': time.time()
            }
            
            logger.info(f"WebSocket client connected: {self.connection_data[websocket]['client_id']}")
            
            # Send initial connection confirmation
            await self.send_to_client(websocket, {
                'type': 'connection_confirmed',
                'client_id': self.connection_data[websocket]['client_id'],
                'timestamp': datetime.now().isoformat(),
                'available_streams': [
                    'market_data',
                    'trading_signals', 
                    'portfolio_updates',
                    'risk_alerts',
                    'system_status'
                ]
            })
            
            # Start streaming if this is the first connection
            if len(self.active_connections) == 1 and not self.streaming_active:
                self.start_streaming()
                
        except Exception as e:
            logger.error(f"Error connecting WebSocket client: {e}")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        try:
            if websocket in self.active_connections:
                client_id = self.connection_data.get(websocket, {}).get('client_id', 'unknown')
                self.active_connections.remove(websocket)
                
                if websocket in self.connection_data:
                    del self.connection_data[websocket]
                
                logger.info(f"WebSocket client disconnected: {client_id}")
                
                # Stop streaming if no active connections
                if len(self.active_connections) == 0:
                    self.stop_streaming()
                    
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket client: {e}")
    
    async def send_to_client(self, websocket: WebSocket, data: Dict):
        """Send data to a specific client"""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Error sending data to client: {e}")
            # Remove disconnected client
            if websocket in self.active_connections:
                self.disconnect(websocket)
    
    async def broadcast(self, data: Dict, stream_type: str = None):
        """Broadcast data to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected_clients = []
        
        for websocket in self.active_connections.copy():
            try:
                # Check if client is subscribed to this stream type
                client_data = self.connection_data.get(websocket, {})
                subscriptions = client_data.get('subscriptions', set())
                
                if stream_type is None or stream_type in subscriptions or len(subscriptions) == 0:
                    await websocket.send_text(json.dumps(data))
                    
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected_clients.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_clients:
            self.disconnect(websocket)
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """Handle incoming messages from clients"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'subscribe':
                # Subscribe to specific data streams
                streams = data.get('streams', [])
                if websocket in self.connection_data:
                    self.connection_data[websocket]['subscriptions'].update(streams)
                    
                await self.send_to_client(websocket, {
                    'type': 'subscription_confirmed',
                    'streams': list(self.connection_data[websocket]['subscriptions']),
                    'timestamp': datetime.now().isoformat()
                })
                
            elif message_type == 'unsubscribe':
                # Unsubscribe from streams
                streams = data.get('streams', [])
                if websocket in self.connection_data:
                    self.connection_data[websocket]['subscriptions'] -= set(streams)
                    
                await self.send_to_client(websocket, {
                    'type': 'unsubscription_confirmed',
                    'streams': streams,
                    'timestamp': datetime.now().isoformat()
                })
                
            elif message_type == 'ping':
                # Handle ping for connection health
                if websocket in self.connection_data:
                    self.connection_data[websocket]['last_ping'] = time.time()
                    
                await self.send_to_client(websocket, {
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                })
                
            elif message_type == 'get_status':
                # Send current system status
                await self.send_system_status(websocket)
                
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
    
    async def send_system_status(self, websocket: WebSocket = None):
        """Send comprehensive system status"""
        try:
            status_data = {
                'type': 'system_status',
                'timestamp': datetime.now().isoformat(),
                'connected_clients': len(self.active_connections),
                'streaming_active': self.streaming_active,
                'performance_summary': comprehensive_logger.get_performance_summary(),
                'active_positions': len(trading_engine.positions),
                'recent_alerts': len(comprehensive_logger.get_recent_alerts(10))
            }
            
            if websocket:
                await self.send_to_client(websocket, status_data)
            else:
                await self.broadcast(status_data, 'system_status')
                
        except Exception as e:
            logger.error(f"Error sending system status: {e}")
    
    def start_streaming(self):
        """Start background streaming threads"""
        if self.streaming_active:
            return
            
        self.streaming_active = True
        
        # Start streaming threads
        threading.Thread(target=self._market_data_stream_worker, daemon=True).start()
        threading.Thread(target=self._trading_signals_stream_worker, daemon=True).start()
        threading.Thread(target=self._portfolio_stream_worker, daemon=True).start()
        threading.Thread(target=self._alerts_stream_worker, daemon=True).start()
        
        logger.info("WebSocket streaming started")
    
    def stop_streaming(self):
        """Stop background streaming"""
        self.streaming_active = False
        logger.info("WebSocket streaming stopped")
    
    def _market_data_stream_worker(self):
        """Background worker for market data streaming"""
        while self.streaming_active:
            try:
                # Get latest market data
                from backend.state import get_market_data_cache
                market_data = get_market_data_cache()
                
                if market_data:
                    stream_data = {
                        'type': 'market_data_update',
                        'timestamp': datetime.now().isoformat(),
                        'data': market_data,
                        'token_count': len(market_data)
                    }
                    
                    # Use asyncio to broadcast
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast(stream_data, 'market_data'),
                        asyncio.get_event_loop()
                    )
                
                time.sleep(self.market_data_interval)
                
            except Exception as e:
                logger.error(f"Error in market data stream worker: {e}")
                time.sleep(5)
    
    def _trading_signals_stream_worker(self):
        """Background worker for trading signals streaming"""
        while self.streaming_active:
            try:
                # Get latest trading signals (simplified - would integrate with trading engine)
                signals_data = {
                    'type': 'trading_signals_update',
                    'timestamp': datetime.now().isoformat(),
                    'signals': [],  # Would get from trading engine
                    'signal_count': 0
                }
                
                # Use asyncio to broadcast
                asyncio.run_coroutine_threadsafe(
                    self.broadcast(signals_data, 'trading_signals'),
                    asyncio.get_event_loop()
                )
                
                time.sleep(self.signals_interval)
                
            except Exception as e:
                logger.error(f"Error in trading signals stream worker: {e}")
                time.sleep(10)
    
    def _portfolio_stream_worker(self):
        """Background worker for portfolio updates streaming"""
        while self.streaming_active:
            try:
                # Get portfolio summary
                portfolio_summary = trading_engine.get_portfolio_summary()
                
                portfolio_data = {
                    'type': 'portfolio_update',
                    'timestamp': datetime.now().isoformat(),
                    'data': portfolio_summary
                }
                
                # Use asyncio to broadcast
                asyncio.run_coroutine_threadsafe(
                    self.broadcast(portfolio_data, 'portfolio_updates'),
                    asyncio.get_event_loop()
                )
                
                time.sleep(self.portfolio_interval)
                
            except Exception as e:
                logger.error(f"Error in portfolio stream worker: {e}")
                time.sleep(5)
    
    def _alerts_stream_worker(self):
        """Background worker for risk alerts streaming"""
        while self.streaming_active:
            try:
                # Get recent alerts
                recent_alerts = comprehensive_logger.get_recent_alerts(5)
                
                if recent_alerts:
                    alerts_data = {
                        'type': 'risk_alerts_update',
                        'timestamp': datetime.now().isoformat(),
                        'alerts': recent_alerts,
                        'alert_count': len(recent_alerts)
                    }
                    
                    # Use asyncio to broadcast
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast(alerts_data, 'risk_alerts'),
                        asyncio.get_event_loop()
                    )
                
                time.sleep(self.alerts_interval)
                
            except Exception as e:
                logger.error(f"Error in alerts stream worker: {e}")
                time.sleep(2)
    
    def get_connection_stats(self) -> Dict:
        """Get WebSocket connection statistics"""
        return {
            'active_connections': len(self.active_connections),
            'streaming_active': self.streaming_active,
            'connection_details': [
                {
                    'client_id': data['client_id'],
                    'connected_at': data['connected_at'].isoformat(),
                    'subscriptions': list(data['subscriptions']),
                    'last_ping': data['last_ping']
                }
                for data in self.connection_data.values()
            ]
        }

# Global WebSocket manager instance
websocket_manager = WebSocketManager()