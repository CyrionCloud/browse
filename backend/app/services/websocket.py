import socketio
from app.core.config import settings

# Create Socket.IO server (Native Async)
# Use '*' for CORS to allow all origins during development
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

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

async def notify_session(session_id: str, event: str, payload: dict):
    """
    Broadcast event to session room.
    """
    await sio.emit(event, payload, room=f"session:{session_id}")
