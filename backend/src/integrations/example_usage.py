#!/usr/bin/env python3
"""
Example usage of the Python Bridge for AutoBrowse.
This script demonstrates how to interact with the bridge.py script
as a subprocess, similar to how the Node.js backend does it.
"""

import subprocess
import json
import os
import sys
import time
import base64

# Configuration
BRIDGE_SCRIPT = os.path.join(os.path.dirname(__file__), 'bridge.py')
VENV_PYTHON = os.path.join(os.path.dirname(__file__), 'venv', 'bin', 'python3')

# Use venv python if available, otherwise system python
PYTHON_CMD = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

def send_message(process, message):
    """Send a JSON message to the bridge process"""
    json_line = json.dumps(message)
    process.stdin.write(json_line + '\n')
    process.stdin.flush()

def read_response(process):
    """Read a JSON response from the bridge process"""
    line = process.stdout.readline()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        print(f"Error decoding JSON: {line}")
        return None

def main():
    print(f"Starting bridge process using: {PYTHON_CMD}")
    
    # Start the bridge process
    process = subprocess.Popen(
        [PYTHON_CMD, BRIDGE_SCRIPT],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr, # Pass stderr to console for debugging
        text=True,
        bufsize=1
    )

    try:
        # 1. Health Check
        print("\n--- 1. Health Check ---")
        msg = {
            "id": "req-1",
            "type": "browser_use",
            "method": "health",
            "params": {}
        }
        send_message(process, msg)
        response = read_response(process)
        print(json.dumps(response, indent=2))

        # 2. Navigate
        print("\n--- 2. Navigate to example.com ---")
        msg = {
            "id": "req-2",
            "type": "browser_use",
            "method": "navigate",
            "params": {
                "url": "https://example.com"
            },
            "sessionId": "demo-session"
        }
        send_message(process, msg)
        response = read_response(process)
        # Truncate long output for display
        print(json.dumps(response, indent=2))

        # 3. Screenshot
        print("\n--- 3. Take Screenshot ---")
        msg = {
            "id": "req-3",
            "type": "browser_use",
            "method": "screenshot",
            "params": {},
            "sessionId": "demo-session"
        }
        send_message(process, msg)
        response = read_response(process)
        
        screenshot_data = ""
        if response and response.get('success'):
            screenshot_data = response['data'].get('screenshot', '')
            print(f"Screenshot taken (size: {len(screenshot_data)} chars)")
            # Don't print the whole base64 string
            response['data']['screenshot'] = f"<base64 data length {len(screenshot_data)}>"
            print(json.dumps(response, indent=2))
        else:
            print("Screenshot failed")
            print(json.dumps(response, indent=2))

        # 3.5 Extract DOM Text (Browser Use)
        print("\n--- 3.5 Extract DOM Text (Browser Use) ---")
        msg = {
            "id": "req-3-5",
            "type": "browser_use",
            "method": "extract",
            "params": {
                "selector": "body"
            },
            "sessionId": "demo-session"
        }
        send_message(process, msg)
        response = read_response(process)
        # Truncate long text
        if response and response.get('success') and response.get('data', {}).get('text'):
             text = response['data']['text']
             response['data']['text'] = text[:100] + "..." if len(text) > 100 else text
        print(json.dumps(response, indent=2))

        # 4. Vision Analysis (Owl)
        if screenshot_data:
            print("\n--- 4. Analyze Screenshot (Owl) ---")
            msg = {
                "id": "req-4",
                "type": "owl",
                "method": "analyze_screenshot",
                "params": {
                    "screenshot": screenshot_data
                }
            }
            send_message(process, msg)
            response = read_response(process)
            print(json.dumps(response, indent=2))

            # 5. Extract Text
            print("\n--- 5. Extract Text ---")
            msg = {
                "id": "req-5",
                "type": "owl",
                "method": "extract_text",
                "params": {
                    "screenshot": screenshot_data
                }
            }
            send_message(process, msg)
            response = read_response(process)
            print(json.dumps(response, indent=2))

        # 6. Close Session
        print("\n--- 6. Close Session ---")
        msg = {
            "id": "req-6",
            "type": "browser_use",
            "method": "close_session",
            "params": {},
            "sessionId": "demo-session"
        }
        send_message(process, msg)
        response = read_response(process)
        print(json.dumps(response, indent=2))

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Shutdown bridge
        print("\n--- Shutting down bridge ---")
        try:
            msg = {
                "id": "req-shutdown",
                "type": "browser_use",
                "method": "shutdown",
                "params": {}
            }
            send_message(process, msg)
        except:
            pass
        
        process.terminate()
        process.wait()
        print("Bridge process terminated.")

if __name__ == "__main__":
    main()
