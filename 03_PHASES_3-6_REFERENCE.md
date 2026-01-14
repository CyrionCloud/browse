# Phases 3-6 Reference Guide

This document provides a comprehensive reference for implementing Phases 3-6 of the AutoBrowse SaaS project.

## PHASE 3: BACKEND CORE ARCHITECTURE (Steps 26-40)

### Overview
Build the complete backend infrastructure including browser automation, AI integration, WebSocket communication, and API endpoints.

### Key Files to Create

#### 1. Logger Utility (`backend/src/utils/logger.ts`)
- Use Winston for structured logging
- Configure log levels: debug, info, warn, error
- Create file transports for error.log and combined.log
- Add colorized console output

#### 2. Browser Service (`backend/src/services/BrowserService.ts`)
- Initialize Playwright browser with chromium
- Configure headless mode, viewport, user agent
- Implement navigate(), screenshot(), getPage() methods
- Handle browser lifecycle (init, close)
- Add error handling and logging

#### 3. Agent Service (`backend/src/services/AgentService.ts`)
- Initialize Anthropic Claude client
- Implement chat() method with conversation history
- Create planBrowserActions() for task decomposition
- Add system prompts for browser automation
- Handle API errors and retries

#### 4. Browser-Use Integration (`backend/src/services/BrowserUseService.ts`)
- Combine BrowserService + AgentService
- Implement executeTask() with progress callbacks
- Execute actions: navigate, click, type, extract, wait, scroll
- Handle action failures with retry logic
- Take screenshots after each action
- Emit WebSocket events for real-time updates

#### 5. Session Manager (`backend/src/services/SessionManager.ts`)
- Extend EventEmitter for session events
- createSession(): Check quotas, create DB record
- startSession(): Execute task with BrowserUseService
- pauseSession(), cancelSession() methods
- Store actions in database
- Track active sessions in Map
- Update session status in database

#### 6. WebSocket Server (`backend/src/services/WebSocketServer.ts`)
- Initialize Socket.IO with HTTP server
- Configure CORS for frontend
- Handle client connections/disconnections
- Implement subscribe/unsubscribe to sessions
- Forward SessionManager events to subscribed clients
- Add connection logging

#### 7. Session Controller (`backend/src/controllers/sessionController.ts`)
- createSession: POST /api/sessions
- startSession: POST /api/sessions/:id/start
- pauseSession: POST /api/sessions/:id/pause
- cancelSession: POST /api/sessions/:id/cancel
- getSession: GET /api/sessions/:id
- getUserSessions: GET /api/users/:id/sessions
- getSessionActions: GET /api/sessions/:id/actions

#### 8. Chat Controller (`backend/src/controllers/chatController.ts`)
- sendMessage: POST /api/chat
- getMessages: GET /api/sessions/:id/messages
- Maintain AgentService instances per session
- Store messages in database
- Return AI responses

#### 9. Skills Service & Controller
- getAvailableSkills(): Fetch from database
- toggleSkill(): Enable/disable for user
- updateSkillConfig(): Save custom configuration
- API endpoints: GET /api/skills, PUT /api/skills/:id/toggle

#### 10. Authentication Middleware (`backend/src/middleware/auth.ts`)
- Extract Bearer token from Authorization header
- Validate with Supabase auth.getUser()
- Attach user info to request object
- Return 401 for invalid tokens

#### 11. Rate Limiter Middleware (`backend/src/middleware/rateLimiter.ts`)
- Track requests per user/IP in Map
- Configure limits: maxRequests, windowMs
- Return 429 when limit exceeded
- Clean up old entries periodically

#### 12. Main Express Server (`backend/src/index.ts`)
- Initialize Express app
- Configure CORS, body parsers
- Create HTTP server
- Initialize SessionManager, WebSocketServer
- Mount all routes
- Add error handling middleware
- Start server on configured PORT
- Handle graceful shutdown

---

## PHASE 4: FRONTEND CORE (Steps 41-60)

### Overview
Build the complete frontend UI including chat interface, session management, settings, and state management.

### Key Files to Create

#### 1. Global Styles (`frontend/app/globals.css`)
- Import Tailwind directives
- Define CSS custom properties for colors
- Add scrollbar styling
- Create utility classes (glass, glass-border)
- Define custom animations (glow, fade-in, slide-up)

#### 2. Root Layout (`frontend/app/layout.tsx`)
- Import Geist fonts (Sans & Mono)
- Setup HTML structure with font variables
- Add metadata for SEO
- Wrap children with providers

#### 3. Utilities (`frontend/lib/utils.ts`)
- cn(): Merge Tailwind classes with clsx + tailwind-merge
- formatDuration(): Convert seconds to readable format
- formatDate(): Format timestamps
- truncate(): Shorten strings

#### 4. Zustand Store (`frontend/store/useAppStore.ts`)
- State: currentSession, sessions, isConnected, agentConfig
- Actions: setCurrentSession, updateSession, setConnected, updateAgentConfig
- TypeScript interfaces for type safety

#### 5. WebSocket Hook (`frontend/hooks/useWebSocket.ts`)
- Initialize Socket.IO client
- Handle connect/disconnect events
- subscribeToSession(): Listen for session updates
- unsubscribeFromSession(): Clean up listeners
- Return socket instance and helper functions

#### 6. API Client (`frontend/lib/api/client.ts`)
- Create axios instance with baseURL
- Add request interceptor for auth tokens
- Get Supabase session token
- Attach Authorization header

#### 7. API Services
- `sessions.ts`: create, start, pause, cancel, get, getUserSessions, getActions
- `chat.ts`: sendMessage, getMessages
- All use axios instance with proper typing

#### 8. UI Components (in `frontend/components/ui/`)
- Button: Variants (default, destructive, outline, ghost), sizes
- Input: Styled text input with focus states
- Card: Container components (Card, CardHeader, CardTitle, CardContent)
- Switch: Toggle component with Radix UI
- Tabs: Tab navigation with Radix UI
- Toast: Notification system with auto-dismiss

#### 9. Chat Components
- ChatInput: Message input with send button
- ChatMessage: Display user/assistant messages with icons
- ChatContainer: Full chat interface with history and real-time updates

#### 10. Session Components
- SessionStatus: Display status with colored icons (pending, active, completed, failed)
- SessionHistory: List of past sessions with details

#### 11. Settings Components
- SettingsPanel: Advanced configuration (model, max steps, behaviors, proxy, domains)
- SkillsList: Enable/disable automation skills

#### 12. Layout Component (`frontend/components/layout/MainLayout.tsx`)
- Left sidebar: Navigation icons (Home, History, Skills, Settings)
- Main content area: Children
- Right sidebar: Settings/info panel
- Responsive design

#### 13. Main Dashboard Page (`frontend/app/page.tsx`)
- Check authentication, redirect if not logged in
- Create new session button
- Start session button
- Display SessionStatus
- Render ChatContainer when session exists
- Empty state with welcome message

---

## PHASE 5: AUTHENTICATION & DEPLOYMENT (Steps 61-70)

### Overview
Implement user authentication, configure deployment, and set up monitoring.

### Key Files to Create

#### 1. Login Page (`frontend/app/auth/login/page.tsx`)
- Email/password form
- Sign in with Supabase auth
- Sign up functionality
- Error handling
- Redirect after login

#### 2. Auth Callback (`frontend/app/auth/callback/route.ts`)
- Handle OAuth callback
- Exchange code for session
- Redirect to dashboard

#### 3. Middleware (`frontend/middleware.ts`)
- Protect dashboard routes
- Check Supabase session
- Redirect to login if not authenticated
- Redirect to dashboard if already logged in

#### 4. Environment Configuration
- Document all required environment variables
- Create setup guide (SETUP.md)
- List API key requirements
- Provide step-by-step configuration

#### 5. Deployment Configurations
- `vercel.json`: Frontend deployment to Vercel
- `railway.json`: Backend deployment to Railway
- `Dockerfile`: Backend containerization
- `.dockerignore`: Exclude from Docker builds

#### 6. Docker Compose (`docker-compose.yml`)
- Service for backend
- Service for frontend
- Environment variable configuration
- Volume mounts for logs
- Network configuration

#### 7. Health Monitoring (`backend/src/utils/health.ts`)
- Check database connectivity
- Verify Playwright availability
- Validate API keys
- Return health status (healthy/degraded/unhealthy)
- Expose /health endpoint

#### 8. Testing Setup
- Jest configuration for backend
- Test scripts in package.json
- Basic integration tests
- Type checking scripts

#### 9. Deployment Guide (`docs/DEPLOYMENT.md`)
- Prerequisites
- Railway setup for backend
- Vercel setup for frontend
- Environment variable configuration
- Post-deployment checklist
- Monitoring setup
- Scaling considerations
- Security hardening

---

## PHASE 6: FINAL INTEGRATION (Steps 71-80)

### Overview
Add polish, error handling, testing, and complete documentation.

### Key Files to Create

#### 1. Integration Tests (`backend/src/__tests__/session.test.ts`)
- Test SessionManager functionality
- Test quota enforcement
- Test session lifecycle
- Mock Supabase calls

#### 2. Error Boundary (`frontend/components/ErrorBoundary.tsx`)
- Catch React component errors
- Display friendly error message
- Provide retry functionality
- Log errors for debugging

#### 3. Loading States (`frontend/components/LoadingState.tsx`)
- Animated spinner
- Loading message
- Reusable across app

#### 4. Usage Dashboard (`frontend/components/dashboard/UsageDashboard.tsx`)
- Display session statistics
- Show quotas and usage
- Visualize data with cards
- Use Supabase RPC functions

#### 5. Session History (`frontend/components/session/SessionHistory.tsx`)
- List past sessions
- Show status icons
- Display duration and actions
- Click to view details

#### 6. Keyboard Shortcuts (`frontend/hooks/useKeyboardShortcuts.ts`)
- Hook for global keyboard shortcuts
- Cmd/Ctrl + N: New session
- Cmd/Ctrl + K: Command palette
- Escape: Close modals

#### 7. Command Palette (`frontend/components/CommandPalette.tsx`)
- Fuzzy search for commands
- Keyboard navigation
- Execute actions
- Show/hide with shortcut

#### 8. Toast System (`frontend/components/ui/toast.tsx`)
- Toast notifications
- Auto-dismiss after timeout
- Success/error variants
- Queue multiple toasts

#### 9. Update Root Layout
- Wrap with ErrorBoundary
- Add ToastProvider
- Configure fonts properly
- Set metadata for SEO

#### 10. Final Documentation (`README.md`)
- Complete project overview
- Architecture diagram
- Getting started guide
- API documentation
- Deployment instructions
- Contributing guidelines
- License information

---

## Implementation Notes

### For Claude Code Agent:

1. **File Creation Order**: Follow the order within each phase
2. **Dependencies First**: Always install packages before creating files that use them
3. **Test Incrementally**: Test each service after creating it
4. **Environment Variables**: Track needed variables and document them
5. **Error Handling**: Add try-catch blocks in all async functions
6. **TypeScript**: Ensure all files type-check without errors
7. **Imports**: Use correct import paths (@/ alias for frontend)

### Critical Integration Points:

1. **Backend ↔ Database**: Supabase client must be configured with service key
2. **Frontend ↔ Backend**: API client needs correct backend URL
3. **Frontend ↔ Supabase**: Auth helpers need anon key
4. **WebSocket**: Frontend must connect to correct WS URL
5. **Session Flow**: Create → Start → Execute → Update → Complete

### Testing Checklist:

- [ ] Users can sign up and log in
- [ ] Sessions can be created
- [ ] WebSocket connection works
- [ ] Chat messages are sent and received
- [ ] Browser automation executes
- [ ] Actions are logged
- [ ] Sessions complete successfully
- [ ] Errors are handled gracefully
- [ ] UI is responsive
- [ ] Settings can be changed

---

## Quick Command Reference

```bash
# Setup
npm run install:all

# Development
npm run dev

# Build
npm run build

# Type Check
npm run type-check

# Test
cd backend && npm test

# Clean
npm run clean

# Deploy Backend (Railway)
railway up

# Deploy Frontend (Vercel)
vercel --prod
```

---

## Color Palette Reference

```css
/* Dark Theme */
--dark-bg: #0a0a0a;
--dark-surface: #121212;
--dark-elevated: #1a1a1a;
--dark-border: #2a2a2a;

/* Primary (Cyan) */
--primary-500: #00d9ff;
--primary-400: #1ad9ff;
--primary-600: #00b8d9;

/* Alert (Pink) */
--alert-500: #ff0080;
--alert-400: #ff1a75;
--alert-600: #d9006b;

/* Success */
--success-500: #00ff88;

/* Warning */
--warning-500: #ffaa00;
```

---

## Final Notes

This reference guide provides all the information needed to implement Phases 3-6. Each section describes what needs to be built and provides architectural guidance. The actual implementation should follow TypeScript best practices, proper error handling, and comprehensive logging.

For detailed code implementations, refer to similar patterns in the project or consult official documentation for the respective libraries.
