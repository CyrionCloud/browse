FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all required components
RUN apt-get update && apt-get install -y \
    # Virtual framebuffer for headless display
    xvfb \
    # X11 utilities for display detection
    x11-xserver-utils \

    # Git for cloning noVNC
    git \
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
    # Port forwarding tool
    socat \
    # Media tools for WebRTC
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (stable)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install go2rtc (WebRTC Server)
RUN wget -q -O /usr/local/bin/go2rtc https://github.com/AlexxIT/go2rtc/releases/download/v1.8.5/go2rtc_linux_amd64 \
    && chmod +x /usr/local/bin/go2rtc

# Copy go2rtc configuration
COPY go2rtc.yaml /etc/go2rtc.yaml

# Environment configuration
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1920
ENV SCREEN_HEIGHT=1080
ENV SCREEN_DEPTH=24

# Copy supervisor configuration and Chrome startup script

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-chrome.sh /usr/local/bin/start-chrome.sh
RUN chmod +x /usr/local/bin/start-chrome.sh

# Create a non-root user for Chrome (security)
RUN useradd -m -s /bin/bash chrome \
    && mkdir -p /home/chrome/Downloads \
    && chown -R chrome:chrome /home/chrome



# Expose ports
# 9222 - Chrome DevTools Protocol (for Playwright)
# 1984 - go2rtc API / WebRTC WHEP
# 8554 - RTSP (Internal)
EXPOSE 9222 1984


# Labels
LABEL maintainer="AutoBrowse"
LABEL description="Browser container with Chrome, Xvfb, VNC, noVNC for embedded browser automation"
LABEL version="1.0"

# Start supervisor which manages all processes
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
