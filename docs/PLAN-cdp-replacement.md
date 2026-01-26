# CDP Streamer Implementation Plan

## 🎯 Objective
Replace the heavy `noVNC` stack with a lightweight, native Chrome DevTools Protocol (CDP) streamer, and upgrade to WebRTC for Cloud-Native performance.

## 📊 Comparison Strategy

| Feature | noVNC (Current) | CDP Stream (Bin Option) | WebRTC (Phase 7 - New) |
|:---|:---|:---|:---|
| **Protocol** | RFB | CDP `Page.startScreencast` | **WHEP / WebRTC** |
| **Transport** | TCP (WebSocket) | TCP (Socket.IO Binary) | **UDP / TCP (Hybrid)** |
| **Format** | Raw/Encodings | JPEG Frames | **H.264 Video** |
| **FPS** | ~30 | ~15-20 (Optimized) | **60+** |
| **Latency** | Medium | Low | **Ultra Low** |

---

## 📅 Phases & Progress

| Date | Phase | Status | Output |
|:---|:---|:---|:---|
| 2026-01-21 | **Phase 1: Backend Service** | 🟢 Complete | `CDPStreamerService` created & wired |
| 2026-01-21 | **Phase 2: API Integration** | 🟢 Complete | Wired `start_stream` / `stop_stream` events |
| 2026-01-21 | **Phase 3: Frontend** | 🟢 Complete | `LiveCanvas` component created |
| 2026-01-21 | **Phase 4: Integration** | 🟢 Complete | Added "Stream (CDP)" tab to UI |
| 2026-01-21 | **Phase 5: Testing & Fixes** | 🟢 Complete | Fixed connections, quality (90%), and targets |
| 2026-01-21 | **Phase 6: Optimization** | 🟢 Complete | **Binary Transport** implemented (ArrayBuffer) |
| 2026-01-21 | **Phase 7: Cloud Native** | � Complete | **WebRTC Implementation** (go2rtc + ffmpeg) |

---

## 🏗️ Phase 7: WebRTC Architecture
**Goal**: Native Video Streaming (H.264) from the container.

### 1. The Stack
-   **Streamer**: `go2rtc` (Lightweight Golang binary).
-   **Piping**: `FFmpeg` (Captures Xvfb Display `:99`).
-   **Client**: Browser native `<video>` element via WHEP (WebRTC HTTP Egress Protocol).

### 2. Implementation Steps
1.  **Container Update**:
    -   Install `ffmpeg` (via apt).
    -   Download `go2rtc` binary to `/usr/local/bin`.
    -   Update `supervisord.conf` to run `go2rtc`.
2.  **Configuration (`go2rtc.yaml`)**:
    -   Define stream: `exec:ffmpeg -f x11grab -i :99 -c:v libx264 ... -f rtsp ...`
3.  **Frontend**:
    -   Create `WebRTCPlayer.tsx`.
    -   Connect to `http://localhost:1984/api/whep`.

### 🚨 Requirements
-   **Docker Rebuild**: Completed. Image `autobrowse/browser:latest` now includes `ffmpeg` and `go2rtc`.

## 🚀 Usage

### 1. Start Support Matrix
The `browser` container now supports **Three Streaming Modes**:

| Mode | Port | URL | Latency | Quality |
|:---|:---|:---|:---|:---|
| **Legacy (noVNC)** | 6080 | `http://localhost:6080/vnc.html` | Medium | Low (Raw) |
| **CDP Stream** | 9222 | `ws://localhost:9222` (via Backend) | Low | Medium (JPEG) |
| **WebRTC (Ultra)** | 1984 | `http://localhost:1984/api/whep` | **Zero** | **High (H.264)** |

### 2. Frontend Selection
-   Open the App.
-   Click **"Stream (Ultra)"** tab in the Session Viewer.
-   Enjoy regular 60fps video stream of the browser.

---

## 🔍 Implementation Details (Previous Phases)

### Backend (`CDPStreamerService`)
- Connects to Chrome Debugger (`ws://container:9222`)
- Fowards JPEG frames via Socket.IO Binary events.

### Frontend (`LiveCanvas`)
- Renders ArrayBuffers to Canvas.
