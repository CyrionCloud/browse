# CLAUDE.md - AI Assistant Guide for AutoBrowse SaaS

> **Last Updated:** 2026-01-14
> **Repository:** CyrionCloud/browse
> **Project:** AutoBrowse - AI-Powered Browser Automation SaaS

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Getting Started](#getting-started)
5. [Development Workflow](#development-workflow)
6. [Phase-by-Phase Implementation Guide](#phase-by-phase-implementation-guide)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Key Conventions](#key-conventions)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices for AI Assistants](#best-practices-for-ai-assistants)

---

## Project Overview

**AutoBrowse** is a production-ready SaaS platform that enables users to automate browser tasks through natural language commands powered by AI.

### What This Builds

A fully functional browser automation SaaS with:
- ✅ User authentication (Supabase)
- ✅ Natural language task input via chat
- ✅ Real-time browser automation with Playwright
- ✅ AI-powered task planning (Claude API)
- ✅ WebSocket live updates
- ✅ Session management and history
- ✅ Pre-built automation skills
- ✅ Usage analytics and quotas
- ✅ Advanced agent configuration
- ✅ Dark theme UI with cyan/teal accents
- ✅ Geist Mono typography

### Project Statistics

- **Total Implementation Steps:** 80 (across 6 phases)
- **Estimated Time:** 8-12 hours for autonomous execution
- **Files to Create:** 100+
- **Lines of Code:** ~10,000+

### Key Features

1. **Chat Interface:** Natural language input with AI-powered responses
2. **Browser Automation:** Playwright integration with action execution
3. **Session Management:** Create, start, pause, cancel sessions
4. **Skills System:** Pre-built templates for common automation tasks
5. **Settings & Config:** Model selection, agent behaviors, proxy settings

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom dark theme
- **State Management:** Zustand
- **Real-time:** Socket.IO Client
- **Components:** Radix UI
- **Fonts:** Geist Mono & Geist Sans
- **Animation:** Framer Motion

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express + TypeScript
- **WebSocket:** Socket.IO
- **Browser Control:** Playwright
- **Automation Framework:** browser-use (open source)
- **Vision:** Owl integration (from Camel AI)
- **Logging:** Winston

### Database & Auth
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT-based)
- **Security:** Row Level Security (RLS)

### AI
- **Model:** Anthropic Claude Sonnet 4.5
- **SDK:** @anthropic-ai/sdk

### Deployment
- **Frontend:** Vercel
- **Backend:** Railway or Fly.io
- **Database:** Supabase (cloud-hosted)

---

## Repository Structure

```
browse/
├── frontend/                    # Next.js 14 application
│   ├── app/                    # App Router pages & layouts
│   │   ├── (auth)/             # Authentication pages
│   │   ├── (dashboard)/        # Main dashboard pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── ui/                 # Radix UI components
│   │   ├── chat/               # Chat interface components
│   │   ├── session/            # Session management components
│   │   └── settings/           # Settings panels
│   ├── lib/                    # Utilities and API clients
│   │   ├── api/                # API service functions
│   │   ├── supabase/           # Supabase client
│   │   └── utils.ts            # Helper functions
│   ├── hooks/                  # Custom React hooks
│   │   ├── useWebSocket.ts     # WebSocket hook
│   │   └── useAuth.ts          # Authentication hook
│   ├── store/                  # Zustand state management
│   │   └── useAppStore.ts      # Global app store
│   ├── tailwind.config.ts      # Tailwind configuration
│   ├── next.config.js          # Next.js configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json            # Frontend dependencies
│
├── backend/                    # Express API server
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   │   ├── sessionController.ts
│   │   │   ├── chatController.ts
│   │   │   └── skillsController.ts
│   │   ├── services/           # Business logic
│   │   │   ├── BrowserService.ts        # Playwright wrapper
│   │   │   ├── AgentService.ts          # Claude AI integration
│   │   │   ├── BrowserUseService.ts     # browser-use integration
│   │   │   ├── SessionManager.ts        # Session lifecycle
│   │   │   └── WebSocketServer.ts       # Socket.IO server
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.ts         # JWT authentication
│   │   │   ├── rateLimiter.ts  # Rate limiting
│   │   │   └── errorHandler.ts # Global error handling
│   │   ├── integrations/       # External integrations
│   │   │   ├── browser-use/    # browser-use framework code
│   │   │   └── owl/            # Owl vision integration
│   │   ├── utils/              # Utilities
│   │   │   └── logger.ts       # Winston logger
│   │   └── index.ts            # Express app entry point
│   ├── supabase/
│   │   └── migrations/         # SQL migration files
│   │       ├── 001_create_profiles_table.sql
│   │       ├── 002_create_sessions_table.sql
│   │       └── ...
│   ├── tsconfig.json           # TypeScript configuration
│   ├── .env.example            # Environment variables template
│   └── package.json            # Backend dependencies
│
├── shared/                     # Shared TypeScript types
│   ├── src/
│   │   ├── types.ts            # All shared types & interfaces
│   │   └── index.ts            # Exports
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json            # Shared package config
│
├── docs/                       # Project documentation
│   └── [Additional docs]
│
├── PROJECT_SUMMARY.md          # Quick project overview
├── 00_EXECUTION_GUIDE.md       # Execution instructions
├── 01_PROJECT_OVERVIEW_AND_PHASE_1.md  # Phase 1 guide
├── 02_PHASE_2_DATABASE_SETUP.md        # Phase 2 guide
├── 03_PHASES_3-6_REFERENCE.md          # Phases 3-6 reference
├── CLAUDE.md                   # This file
├── README.md                   # User-facing documentation
├── package.json                # Root monorepo config
├── .gitignore                  # Git ignore rules
└── .env.example                # Environment variables template
```

---

## Getting Started

### Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed
- **npm or yarn** package manager
- **Git** installed
- **Supabase account** with a project created
- **Anthropic API key** from console.anthropic.com

### Required API Keys

1. **Supabase** (https://supabase.com)
   - Project URL
   - Anon (public) key
   - Service role key

2. **Anthropic** (https://console.anthropic.com)
   - API key for Claude Sonnet 4.5

### Quick Start

```bash
# 1. Clone the repository (if not already cloned)
git clone <repository-url>
cd browse

# 2. Follow Phase 1 to setup project structure
# See 01_PROJECT_OVERVIEW_AND_PHASE_1.md

# 3. Install all dependencies (after Phase 1 completes)
npm run install:all

# 4. Configure environment variables
# Copy .env.example files and fill in API keys
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env

# 5. Execute Phase 2 to setup database
# Run migrations in Supabase Dashboard → SQL Editor
# See 02_PHASE_2_DATABASE_SETUP.md

# 6. Implement Phases 3-6
# See 03_PHASES_3-6_REFERENCE.md

# 7. Run the application
npm run dev
```

### Environment Variables

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

**Backend (`backend/.env`):**
```env
PORT=4000
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ALLOWED_ORIGINS=http://localhost:3000
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
```

### Running the Application

After completing all setup phases:

```bash
# Start both frontend and backend
npm run dev

# Or run individually:
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```

---

## Development Workflow

### Git Branching Strategy

**Branch Naming Convention:**
- Feature branches: `claude/claude-md-<session-id>`
- All development branches must start with `claude/` prefix
- Current development branch: `claude/claude-md-mkdqsdmwp181qugg-9Fu6j`

**Git Operations:**
```bash
# Always use -u flag when pushing to new branches
git push -u origin <branch-name>

# Fetch specific branches
git fetch origin <branch-name>

# Pull with explicit branch
git pull origin <branch-name>
```

**Retry Logic for Network Operations:**
- Retry failed push/fetch operations up to 4 times
- Use exponential backoff: 2s, 4s, 8s, 16s
- Only retry on network errors, not auth failures

### Commit Guidelines

**Commit Message Format:**
```
<type>: <short description>

<optional detailed description>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes

**Best Practices:**
- Write clear, concise commit messages
- Focus on the "why" rather than "what"
- Keep commits atomic and focused
- Test before committing

---

## Phase-by-Phase Implementation Guide

### Phase 1: Project Initialization (Steps 1-15)
**Duration:** ~15 minutes

**Objective:** Create directory structure, install dependencies, configure tooling

**Key Tasks:**
1. Create root project structure (`frontend/`, `backend/`, `shared/`)
2. Initialize Next.js 14 frontend with TypeScript and Tailwind
3. Install frontend dependencies (Supabase, Zustand, Socket.IO, Radix UI)
4. Initialize backend with Express and TypeScript
5. Install backend dependencies (Playwright, Claude SDK, Socket.IO)
6. Clone and integrate browser-use and Owl frameworks
7. Setup shared types package
8. Configure TypeScript for all packages
9. Configure Tailwind with custom dark theme
10. Create environment variable templates
11. Create shared type definitions (80+ types)
12. Configure package scripts
13. Create root monorepo package.json
14. Initialize Git repository
15. Create initial README.md

**Reference:** See `01_PROJECT_OVERVIEW_AND_PHASE_1.md` for detailed instructions

---

### Phase 2: Database Setup (Steps 16-25)
**Duration:** ~20 minutes

**Objective:** Create complete database schema with RLS policies

**Key Tasks:**
1. Create database migrations directory
2. Create 8 database tables:
   - `profiles` (user data)
   - `browser_sessions` (automation sessions)
   - `chat_messages` (conversation history)
   - `browser_actions` (individual actions)
   - `tasks` (saved/scheduled tasks)
   - `skills` (automation templates)
   - `user_skills` (user preferences)
   - `usage_analytics` (tracking)
3. Implement Row Level Security (RLS) policies
4. Create database functions for business logic
5. Setup triggers for automated tasks
6. Configure Supabase clients (frontend & backend)
7. Seed initial data (skills)

**Database Access Patterns:**
- Users can only access their own data
- Service role has full access for backend operations
- RLS policies enforce security at database level

**Reference:** See `02_PHASE_2_DATABASE_SETUP.md` for complete SQL migrations

---

### Phase 3: Backend Core (Steps 26-40)
**Duration:** ~2-3 hours

**Objective:** Build browser automation, AI integration, WebSocket, and API

**Key Services:**
1. **Logger Utility:** Winston-based structured logging
2. **BrowserService:** Playwright browser management
3. **AgentService:** Claude AI integration
4. **BrowserUseService:** Combined automation with progress callbacks
5. **SessionManager:** Session lifecycle management with events
6. **WebSocketServer:** Real-time updates via Socket.IO

**API Controllers:**
- **Session Controller:** CRUD operations for sessions
- **Chat Controller:** Message handling and AI responses
- **Skills Controller:** Skill management

**Middleware:**
- **Authentication:** JWT validation via Supabase
- **Rate Limiting:** Per-user request throttling
- **Error Handling:** Global error middleware

**Reference:** See `03_PHASES_3-6_REFERENCE.md` for implementation details

---

### Phase 4: Frontend Core (Steps 41-60)
**Duration:** ~3-4 hours

**Objective:** Build complete UI with chat interface, session management, and settings

**Key Components:**
1. **Layout & Routing:** App Router setup with auth guards
2. **UI Components:** Radix-based component library
3. **Chat Interface:** Message list, input, AI responses
4. **Session Management:** Create, monitor, control sessions
5. **Settings Panels:** Agent config, skills, preferences
6. **Dashboard:** Usage analytics and history

**State Management:**
- Zustand store for global state
- WebSocket hook for real-time updates
- Supabase client for auth and data

**Styling:**
- Dark theme with custom color palette
- Geist Mono typography
- Glass morphism effects
- Responsive design

**Reference:** See `03_PHASES_3-6_REFERENCE.md` for component specifications

---

### Phase 5: Auth & Deployment (Steps 61-70)
**Duration:** ~1-2 hours

**Objective:** Implement authentication and prepare for deployment

**Key Tasks:**
1. Setup Supabase Auth UI
2. Implement auth guards and protected routes
3. Create deployment configurations (Vercel, Railway)
4. Setup environment variables for production
5. Configure CORS and security headers
6. Implement health check endpoints
7. Setup monitoring and logging
8. Create deployment documentation

**Deployment Architecture:**
```
┌─────────────┐
│   Vercel    │ Frontend (Next.js)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Railway   │ Backend (Express + WebSocket)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Supabase   │ PostgreSQL + Auth
└─────────────┘
```

---

### Phase 6: Final Polish (Steps 71-80)
**Duration:** ~1-2 hours

**Objective:** Testing, documentation, and final improvements

**Key Tasks:**
1. Comprehensive error handling
2. Usage dashboard with analytics
3. Keyboard shortcuts
4. Complete documentation
5. Integration testing
6. Performance optimization
7. Security audit
8. Final testing checklist

---

## Database Schema

### Tables Overview

#### 1. profiles
Extends Supabase `auth.users` with user data and quotas
- **Key Fields:** id, email, subscription_tier, usage_quota, preferences
- **RLS:** Users can only access their own profile

#### 2. browser_sessions
Tracks automation sessions
- **Key Fields:** id, user_id, status, task_description, agent_config, result
- **Statuses:** pending, active, paused, completed, failed, cancelled
- **RLS:** Users can only access their own sessions

#### 3. chat_messages
Stores conversation history
- **Key Fields:** id, session_id, role, content, metadata
- **Roles:** user, assistant, system
- **RLS:** Users can only access messages from their sessions

#### 4. browser_actions
Individual browser actions within sessions
- **Key Fields:** id, session_id, action_type, target_selector, success
- **Action Types:** navigate, click, type, scroll, extract, wait, screenshot
- **RLS:** Users can only access actions from their sessions

#### 5. tasks
Saved and scheduled automation tasks
- **Key Fields:** id, user_id, title, task_config, status, schedule_cron
- **RLS:** Users can only access their own tasks

#### 6. skills
Pre-built automation templates (system-managed)
- **Key Fields:** id, name, category, prompt_template, default_config
- **Categories:** research, shopping, automation, monitoring, productivity, social
- **RLS:** All users can read, admin can modify

#### 7. user_skills
User preferences for skills
- **Key Fields:** user_id, skill_id, enabled, custom_config, usage_count
- **RLS:** Users can only access their own skill preferences

#### 8. usage_analytics
Tracking events for analytics
- **Key Fields:** id, user_id, event_type, event_data
- **Event Types:** session_created, session_completed, action_executed, skill_used
- **RLS:** Users can only access their own analytics

### Database Functions

- `update_updated_at_column()`: Automatically updates timestamps
- `handle_new_user()`: Creates profile on user signup
- `check_session_quota()`: Validates user has available sessions
- `increment_usage_count()`: Tracks skill usage
- `get_user_analytics()`: Aggregates usage statistics

---

## API Reference

### Session Endpoints

```
POST   /api/sessions              Create new session
GET    /api/sessions/:id          Get session details
POST   /api/sessions/:id/start    Start session execution
POST   /api/sessions/:id/pause    Pause running session
POST   /api/sessions/:id/cancel   Cancel session
GET    /api/users/:userId/sessions Get user's sessions
GET    /api/sessions/:id/actions   Get session actions
```

### Chat Endpoints

```
POST   /api/chat                  Send message to AI
GET    /api/sessions/:id/messages Get conversation history
```

### Skills Endpoints

```
GET    /api/skills                Get all available skills
GET    /api/users/:userId/skills  Get user's enabled skills
PUT    /api/skills/:id/toggle     Enable/disable skill
PUT    /api/skills/:id/config     Update skill configuration
```

### WebSocket Events

**Client → Server:**
- `subscribe`: Subscribe to session updates
- `unsubscribe`: Unsubscribe from session

**Server → Client:**
- `session_start`: Session execution started
- `session_update`: Session status changed
- `action_executed`: Browser action completed
- `planning`: AI is planning next actions
- `task_complete`: Session finished successfully
- `error`: Error occurred
- `paused`: Session paused
- `cancelled`: Session cancelled

---

## Key Conventions

### Code Style

**General Principles:**
- Use TypeScript strict mode
- Follow existing patterns in the repository
- Maintain consistent indentation (2 spaces)
- Use meaningful variable and function names
- Write self-documenting code where possible

**TypeScript:**
- Define all types explicitly
- Use interfaces for objects, types for unions
- Import shared types from `@autobrowse/shared`
- Avoid `any` type unless absolutely necessary

**React:**
- Use functional components with hooks
- Implement proper error boundaries
- Memoize expensive computations
- Clean up effects and subscriptions

**File Naming:**
- Components: PascalCase (e.g., `ChatInterface.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useWebSocket.ts`)
- Types: PascalCase (e.g., `SessionTypes.ts`)

### Error Handling

**Security Considerations:**
- Validate all user input at API boundaries
- Prevent command injection in browser actions
- Sanitize data before database operations
- Avoid XSS in chat messages (use markdown safely)
- Follow OWASP Top 10 guidelines

**Error Handling Philosophy:**
- Handle errors at appropriate boundaries
- Log errors with context (Winston)
- Return user-friendly error messages
- Implement retry logic for transient failures
- Use error boundaries in React

### Import Organization

```typescript
// 1. External libraries
import { useState } from 'react'
import axios from 'axios'

// 2. Internal libraries/utils
import { cn } from '@/lib/utils'

// 3. Types
import type { Session } from '@autobrowse/shared'

// 4. Components
import { Button } from '@/components/ui/button'

// 5. Styles (if needed)
import styles from './Component.module.css'
```

---

## Common Tasks

### Creating a New Backend Service

```typescript
// backend/src/services/MyService.ts
import { logger } from '@/utils/logger'

export class MyService {
  constructor() {
    logger.info('MyService initialized')
  }

  async doSomething(): Promise<void> {
    try {
      // Implementation
      logger.info('Action completed')
    } catch (error) {
      logger.error('Action failed', { error })
      throw error
    }
  }
}
```

### Creating a New API Endpoint

```typescript
// backend/src/controllers/myController.ts
import type { Request, Response } from 'express'
import { logger } from '@/utils/logger'

export const myEndpoint = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user // Added by auth middleware

    // Implementation

    res.json({ data: result })
  } catch (error) {
    logger.error('Endpoint error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Add to routes
app.post('/api/my-endpoint', authenticateUser, myEndpoint)
```

### Creating a New React Component

```typescript
// frontend/components/MyComponent.tsx
import { useState } from 'react'
import type { Session } from '@autobrowse/shared'

interface MyComponentProps {
  session: Session
  onUpdate: (session: Session) => void
}

export function MyComponent({ session, onUpdate }: MyComponentProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      // Implementation
    } catch (error) {
      console.error('Action failed', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass p-4 rounded-lg">
      {/* Component content */}
    </div>
  )
}
```

### Adding a New Database Migration

```bash
# Create new migration file
touch backend/supabase/migrations/009_add_new_feature.sql
```

```sql
-- backend/supabase/migrations/009_add_new_feature.sql

-- Create table
CREATE TABLE IF NOT EXISTS public.my_table (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_my_table_user_id ON public.my_table(user_id);

-- Enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can view own data"
    ON public.my_table FOR SELECT
    USING (auth.uid() = user_id);
```

Then run in Supabase Dashboard → SQL Editor.

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend type checking
cd frontend
npm run type-check

# Build test
npm run build
```

---

## Troubleshooting

### Common Issues

#### Installation Failures

**Symptoms:** npm install fails, dependency conflicts

**Solutions:**
- Clear node_modules: `npm run clean && npm run install:all`
- Check Node.js version: `node -v` (should be 18+)
- Delete package-lock.json and retry
- Use `npm install --legacy-peer-deps` if peer dependency issues

#### Database Connection Errors

**Symptoms:** Backend can't connect to Supabase

**Solutions:**
- Verify Supabase credentials in `.env`
- Check Supabase project is active
- Ensure RLS policies are correctly configured
- Verify migrations ran successfully
- Check network connectivity to Supabase

#### Build Errors

**Symptoms:** TypeScript errors, build failures

**Solutions:**
- Run type-check: `npm run type-check`
- Ensure all environment variables are set
- Check for missing dependencies
- Verify shared types are built: `cd shared && npm run build`
- Clear Next.js cache: `rm -rf frontend/.next`

#### WebSocket Connection Issues

**Symptoms:** Real-time updates not working

**Solutions:**
- Verify CORS settings in backend
- Check backend is running: `curl http://localhost:4000`
- Confirm WebSocket URL is correct in frontend env
- Check browser console for connection errors
- Ensure Socket.IO versions match between frontend and backend

#### Playwright Issues

**Symptoms:** Browser automation fails

**Solutions:**
- Ensure Playwright browsers are installed: `npx playwright install`
- Check `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is false
- Verify system dependencies (Linux): `npx playwright install-deps`
- Check available disk space
- Run in non-headless mode for debugging

#### Authentication Issues

**Symptoms:** Login fails, token errors

**Solutions:**
- Verify Supabase anon key is correct
- Check JWT expiration settings
- Clear browser storage and retry
- Ensure auth middleware is applied to routes
- Check Supabase Auth is enabled in dashboard

### Debug Mode

**Enable verbose logging in backend:**
```env
# backend/.env
NODE_ENV=development
LOG_LEVEL=debug
```

**Enable React DevTools:**
- Install React DevTools browser extension
- Components tab shows component tree
- Profiler tab shows performance

**WebSocket Debugging:**
```typescript
// frontend/hooks/useWebSocket.ts
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id)
})

socket.on('disconnect', () => {
  console.log('WebSocket disconnected')
})

socket.onAny((event, ...args) => {
  console.log('WebSocket event:', event, args)
})
```

---

## Best Practices for AI Assistants

### Before Making Changes

1. **Read First:** Always read files before modifying them
   ```typescript
   // Use Read tool to view file
   // Understand existing code
   // Then use Edit tool to modify
   ```

2. **Search for Context:** Use grep/glob to find related code
   ```bash
   # Find all files importing a type
   grep -r "import.*SessionType" frontend/

   # Find all API endpoints
   grep -r "app\.(get|post|put|delete)" backend/src
   ```

3. **Check Tests:** Look for existing tests to understand behavior
   ```bash
   # Find test files
   find . -name "*.test.ts" -o -name "*.spec.ts"
   ```

4. **Review History:** Check git log for recent changes
   ```bash
   git log --oneline -10
   git log --follow -- path/to/file
   ```

### When Writing Code

1. **Avoid Over-Engineering:**
   - Only make requested changes
   - Don't add extra features
   - Keep solutions simple
   - Three similar lines > premature abstraction

2. **Don't Add Unnecessary Elements:**
   - No extra error handling for impossible scenarios
   - No docstrings for unchanged code
   - No refactoring beyond the task
   - No "improvements" not explicitly requested

3. **Security First:**
   - Check for injection vulnerabilities
   - Validate at boundaries only
   - Follow security best practices
   - Fix security issues immediately

4. **Type Safety:**
   - Use TypeScript strict mode
   - Define proper interfaces
   - Import from shared types
   - Avoid `any` type

5. **Clean Code:**
   - Delete unused code completely
   - No backwards-compatibility hacks for new code
   - No `_unused` variables or `// removed` comments
   - If something is unused, delete it

### Tool Usage

**Preferred Tools:**
- `Read` for viewing files (not `cat`)
- `Edit` for modifying files (not `sed`)
- `Write` for creating new files (not `echo >`)
- `Grep` for searching content (not `grep` command)
- `Glob` for finding files (not `find`)

**Task Management:**
- Use `TodoWrite` for multi-step tasks (Phase 1-6)
- Keep todo list updated in real-time
- Mark tasks complete immediately after finishing
- Only one task as in_progress at a time

**Parallel Operations:**
- Run independent tools in parallel
- Make multiple read/grep calls together
- Batch git status/diff/log commands
- Use sequential only when dependencies exist

### Communication

- Output text directly to communicate with users
- Never use bash echo for user messages
- Be concise and clear
- Include file references with line numbers: `file.ts:123`
- Avoid emojis unless explicitly requested
- Explain complex changes with code comments

### Project-Specific Guidelines

1. **Follow the Phases:**
   - Complete Phase 1 before Phase 2
   - Each phase builds on the previous
   - Don't skip steps
   - Verify each phase before proceeding

2. **Type Safety:**
   - All shared types are in `shared/src/types.ts`
   - Import from `@autobrowse/shared`
   - Don't duplicate type definitions

3. **Database Changes:**
   - Always create migration files
   - Never modify database directly
   - Include RLS policies
   - Add comments to SQL

4. **API Endpoints:**
   - Always add authentication middleware
   - Include rate limiting
   - Log all requests
   - Return consistent response format

5. **Frontend Components:**
   - Use Radix UI primitives
   - Follow Tailwind conventions
   - Implement error boundaries
   - Clean up WebSocket subscriptions

### When Stuck

1. **Use Task Tool:**
   - `Explore` for codebase exploration
   - `Plan` for complex implementations
   - `general-purpose` for multi-step research

2. **Consult Documentation:**
   - Read phase guides for reference
   - Check API documentation
   - Review existing patterns

3. **Ask Clarifying Questions:**
   - When requirements are unclear
   - When multiple approaches are possible
   - When user input is needed (API keys)

---

## Additional Resources

### External Documentation

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Playwright:** https://playwright.dev/docs/intro
- **Anthropic:** https://docs.anthropic.com/claude/reference/getting-started-with-the-api
- **Socket.IO:** https://socket.io/docs/v4/
- **Radix UI:** https://www.radix-ui.com/docs/primitives/overview/introduction
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Zustand:** https://github.com/pmndrs/zustand

### Project-Specific Docs

- **Execution Guide:** `00_EXECUTION_GUIDE.md`
- **Project Overview:** `PROJECT_SUMMARY.md`
- **Phase 1:** `01_PROJECT_OVERVIEW_AND_PHASE_1.md`
- **Phase 2:** `02_PHASE_2_DATABASE_SETUP.md`
- **Phases 3-6:** `03_PHASES_3-6_REFERENCE.md`

### External Frameworks

- **browser-use:** https://github.com/browser-use/browser-use
- **Owl (Camel AI):** https://github.com/camel-ai/owl

---

## Success Criteria

The MVP is complete when:

- ✅ Users can sign up and log in via Supabase Auth
- ✅ Users can create browser automation sessions
- ✅ Chat interface works with Claude AI
- ✅ Browser actions execute successfully (navigate, click, type, extract)
- ✅ Sessions are tracked in database and displayed in UI
- ✅ Settings can be configured (agent config, skills)
- ✅ WebSocket updates work in real-time
- ✅ Usage quotas are enforced
- ✅ All TypeScript files compile without errors
- ✅ Frontend and backend run without errors
- ✅ UI matches design specifications (dark theme, cyan accents)

---

## Changelog

### 2026-01-14 - Comprehensive Update
- Created comprehensive CLAUDE.md based on project documentation
- Documented complete technology stack
- Added phase-by-phase implementation guide
- Included database schema reference
- Added API endpoint documentation
- Documented troubleshooting procedures
- Added AI assistant best practices

---

## Design System Reference

### Colors

```css
/* Dark Theme */
--dark-bg: #0a0a0a         /* Main background */
--dark-surface: #121212    /* Cards, panels */
--dark-elevated: #1a1a1a   /* Elevated surfaces */
--dark-border: #2a2a2a     /* Borders */

/* Primary (Cyan) */
--primary-500: #00d9ff     /* Main brand color */
--primary-600: #00b8d9     /* Hover state */

/* Alert (Pink) */
--alert-500: #ff0080       /* Alerts, errors */
--alert-600: #d9006b       /* Hover state */

/* Success (Green) */
--success-500: #00ff88     /* Success states */

/* Warning (Orange) */
--warning-500: #ffaa00     /* Warning states */
```

### Typography

- **Primary Font:** Geist Mono (monospace)
- **Secondary Font:** Geist Sans (sans-serif)
- **Font Sizes:** Tailwind defaults (text-sm, text-base, text-lg, etc.)

### Animations

- `pulse-slow`: Slow pulsing effect (3s)
- `fade-in`: Fade in animation (0.3s)
- `slide-up`: Slide up from bottom (0.3s)
- `slide-down`: Slide down from top (0.3s)
- `spin`: Rotate animation (1s)

### UI Patterns

**Glass Morphism:**
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Glow Effect:**
```css
.glow {
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
}
```

---

**Note to AI Assistants:** This document should be kept up-to-date as the project evolves. When you make significant changes to the codebase structure or development workflow, please update the relevant sections of this document. Always refer to the phase guides for detailed implementation instructions.

**Quick Start:** Begin with Phase 1 in `01_PROJECT_OVERVIEW_AND_PHASE_1.md` and proceed sequentially through all phases.
