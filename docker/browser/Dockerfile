FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all required components
RUN apt-get update && apt-get install -y \
    # Virtual framebuffer for headless display
    xvfb \
    # VNC server
    x11vnc \
    # noVNC web client and dependencies
    novnc \
    # Chrome dependencies
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    # Process manager
    supervisor \
    # WebSocket proxy (for noVNC)
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (stable)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install websockify for WebSocket to TCP proxy
RUN pip3 install --no-cache-dir websockify

# Environment configuration
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1920
ENV SCREEN_HEIGHT=1080
ENV SCREEN_DEPTH=24

# Create directories for noVNC
RUN mkdir -p /opt/novnc \
    && ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create a non-root user for Chrome (security)
RUN useradd -m -s /bin/bash chrome \
    && mkdir -p /home/chrome/Downloads \
    && chown -R chrome:chrome /home/chrome

# Health check - verify VNC is responding
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD x11vnc -display :99 -query connected 2>/dev/null || exit 1

# Expose ports
# 5900 - VNC native port
# 6080 - noVNC WebSocket port (for browser embedding)
# 9222 - Chrome DevTools Protocol (for Playwright)
EXPOSE 5900 6080 9222

# Labels
LABEL maintainer="AutoBrowse"
LABEL description="Browser container with Chrome, Xvfb, VNC, noVNC for embedded browser automation"
LABEL version="1.0"

# Start supervisor which manages all processes
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
