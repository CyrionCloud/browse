import socket
import sys

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    print("Connecting to 127.0.0.1:5900...")
    s.connect(('127.0.0.1', 5900))
    print("Connected.")
    data = s.recv(1024)
    print(f"Received {len(data)} bytes: {data}")
    s.close()
except Exception as e:
    print(f"Error: {e}")
