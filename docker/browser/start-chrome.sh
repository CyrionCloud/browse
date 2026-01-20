#!/bin/bash
# Chrome startup script - waits for Xvfb then launches Chrome with CDP

set -e

echo "Waiting for Xvfb display :99 to be ready..."

# Wait for Xvfb to be ready (up to 30 seconds)
COUNTER=0
while [ $COUNTER -lt 30 ]; do
    if xdpyinfo -display :99 > /dev/null 2>&1; then
        echo "Display :99 is ready!"
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "Timeout waiting for display :99"
    exit 1
fi

# Give Xvfb a moment to fully initialize
sleep 2

echo "Launching Chrome with CDP on port 9222..."

# Launch Chrome with remote debugging
exec google-chrome-stable \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --remote-debugging-port=9222 \
    --remote-debugging-address=0.0.0.0 \
    --display=:99 \
    --window-size=${SCREEN_WIDTH:-1920},${SCREEN_HEIGHT:-1080} \
    --window-position=0,0 \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --disable-hang-monitor \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir=/home/chrome/.config/google-chrome \
    about:blank
