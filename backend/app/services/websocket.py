import socketio
from app.core.config import settings
# Import lazily or inside function to avoid circular imports if needed, 
# but service should be fine.
from app.services.cdp_stream_service import cdp_streamer

# Create Socket.IO server (Native Async)
# Use '*' for CORS to allow all origins during development
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Inject SIO instance into CDP Streamer to break circular dependency
cdp_streamer.set_socket_server(sio)

# Convert to ASGI app
sio_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def subscribe(sid, data):
    print(f"=== SUBSCRIBE EVENT ===")
    print(f"SID: {sid}")
    print(f"Data received: {data}")
    session_id = data if isinstance(data, str) else data.get('sessionId')
    print(f"Session ID extracted: {session_id}")
    if session_id:
        await sio.enter_room(sid, f"session:{session_id}")
        print(f"Entered room: session:{session_id}")
        await sio.emit('status', {'msg': f'Subscribed to {session_id}'}, to=sid)

@sio.event
async def start_stream(sid, data):
    session_id = data.get('sessionId')
    if session_id:
        print(f"Starting stream for session {session_id}")
        await cdp_streamer.start_stream(session_id)

@sio.event
async def stop_stream(sid, data):
    session_id = data.get('sessionId')
    if session_id:
        print(f"Stopping stream for session {session_id}")
        await cdp_streamer.stop_stream(session_id)

async def notify_session(session_id: str, event: str, payload: dict):
    """
    Broadcast event to session room.
    """
    await sio.emit(event, payload, room=f"session:{session_id}")
