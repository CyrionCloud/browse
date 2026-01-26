# Production Deployment Guide

This guide details the steps to deploy the application to a remote production server.

## 1. Prerequisites

Ensure your server has the following installed:
- **Git**: For cloning the repository
- **Docker** & **Docker Compose**: For container orchestration

### Installing Docker (Ubuntu example)
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages:
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 2. Installation

Clone the repository using HTTPS (recommended for servers to avoid SSH key setup):

```bash
git clone https://github.com/CyrionCloud/browse.git
cd browse
```

## 3. Docker Service Setup

The application consists of three main components:
1.  **Frontend**: The Next.js web interface
2.  **Backend**: The FastAPI server (Orchestrator)
3.  **Browser**: A separate environment with Chrome + noVNC (managed by the backend)

### 3.1 Create Backend Dockerfile
**Important**: The `backend/Dockerfile` is missing. Create it manually:

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy dependencies
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false
RUN poetry install --no-interaction --no-ansi --no-root

# Copy app code
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=4000

EXPOSE 4000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
```

### 3.2 Verify Browser Dockerfile
The browser container source is located in `docker/browser/Dockerfile`.
Ensure this file exists. It allows the backend to spawn isolated browser sessions with noVNC support.

### 3.3 Create Production docker-compose.yml
Replace/Update `docker-compose.yml` to include the browser image build and Docker socket mounting.

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_BACKEND_URL=http://backend:4000
      - NEXT_PUBLIC_WS_URL=ws://backend:4000
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # Enable Container Mode
      - BROWSER_MODE=container
      - BROWSER_CONTAINER_IMAGE=autobrowse/browser:latest
      # Configure Browser Network (siblings)
      - DOCKER_NETWORK_NAME=autobrowse-network
    volumes:
      - ./backend/logs:/app/logs
      # Backend needs access to Docker socket to spawn browser containers
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
    depends_on:
      - browser-base

  # This service builds the browser image used by the backend
  browser-base:
    build:
      context: ./docker/browser
      dockerfile: Dockerfile
    image: autobrowse/browser:latest
    # We don't run this container directly, we just build it for the backend to use
    command: ["/bin/true"]
    restart: "no"

networks:
  default:
    name: autobrowse-network
    driver: bridge
```

## 4. Environment Configuration

### Backend (.env)
```bash
cp backend/.env.example backend/.env
# Edit variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY
```
Ensure `BROWSER_MODE=container` is set (or configured via docker-compose env vars as above).

### Frontend (.env.local)
```bash
cp frontend/.env.local.example frontend/.env.local
# Edit variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 5. Deployment

1.  **Build the images**:
    ```bash
    docker-compose build
    ```
    *This builds frontend, backend, and the `autobrowse/browser:latest` image.*

2.  **Start Services**:
    ```bash
    docker-compose up -d frontend backend
    ```
    *(Note: we don't need to 'up' browser-base, it's just for building the image)*

3.  **Verify**:
    Check if the browser image exists for the backend to use:
    ```bash
    docker images | grep autobrowse/browser
    ```

## 6. OWL Vision Model
Ensure `backend/yolov8n.pt` exists. If not, download it or let the app download it on first run (production servers might have restricted egress, so pre-downloading is safer).

## 7. Troubleshooting
If the backend fails to spawn browsers:
- Check permissions on `/var/run/docker.sock`
- Ensure `autobrowse/browser:latest` was built successfully
- Check backend logs: `docker-compose logs -f backend`


cd backend
# Make sure your .env has BROWSER_MODE=container for noVNC
poetry run uvicorn app.main:app --reload --port 4000



# (Optional) Build the browser image manually if needed
docker build -t autobrowse/browser:latest ./docker/browser

# Run the browser container manually
# Stop and remove the stuck container
docker stop browser
docker rm browser

# Start it fresh
docker run -d \
  --name browser \
  --rm \
  -p 6080:6080 \
  -p 9222:9222 \
  -e SCREEN_WIDTH=1920 \
  -e SCREEN_HEIGHT=1080 \
  -e SCREEN_DEPTH=24 \
  --shm-size=2gb \
  autobrowse/browser:latest


  You should see the Chrome browser (currently at about:blank) embedded right in the UI!

Tip: If you want to customize the noVNC URL, add NEXT_PUBLIC_NOVNC_URL=http://your-host:6080/vnc.html to frontend/.env.local.