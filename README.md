# AutoBrowse - AI-Powered Browser Automation SaaS

> Automate web tasks using natural language with AI-powered browser control

## Overview

AutoBrowse is a production-ready SaaS platform that enables users to automate browser tasks through natural language commands powered by AI. It combines the power of Claude AI with browser automation frameworks to execute complex web tasks automatically.

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom dark theme
- **State Management:** Zustand
- **Real-time:** Socket.IO Client
- **Components:** Radix UI
- **Fonts:** Geist Mono & Geist Sans

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

## Features

- **Chat Interface:** Natural language input with AI-powered responses
- **Browser Automation:** Playwright integration with action execution
- **Session Management:** Create, start, pause, cancel sessions
- **Skills System:** Pre-built templates for common automation tasks
- **Settings & Config:** Model selection, agent behaviors, proxy settings
- **Real-time Updates:** WebSocket live updates for session progress
- **Usage Analytics:** Track sessions, actions, and quotas
- **Dark Theme UI:** Muted/neutral color palette with indigo accents

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

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/CyrionCloud/browse.git
cd browse

# 2. Install all dependencies
npm run install:all

# 3. Configure environment variables
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
# Edit both files and add your API keys

# 4. Setup Supabase database
# Run the migrations in backend/supabase/migrations/ in Supabase Dashboard SQL Editor

# 5. Run the application
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

```bash
# Start both frontend and backend
npm run dev

# Or run individually:
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```

## Project Structure

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
│   ├── next.config.ts          # Next.js configuration
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
│   │   ├── utils/              # Utilities
│   │   │   └── logger.ts       # Winston logger
│   │   └── index.ts            # Express app entry point
│   ├── supabase/
│   │   └── migrations/         # SQL migration files
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
│
├── CLAUDE.md                   # AI Assistant guide
├── README.md                   # This file
├── package.json                # Root monorepo config
├── .gitignore                  # Git ignore rules
└── docker-compose.yml          # Docker services
```

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

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Railway)

1. Create a new Railway project
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy using Railway's Node.js template

### Docker

```bash
# Build and run all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

## Development

### Available Scripts

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend

# Build all packages
npm run build

# Type check all packages
npm run type-check

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Database Migrations

Migrations are located in `backend/supabase/migrations/`. To apply a migration:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and run the migration SQL

## Keyboard Shortcuts

- `Ctrl + N` - Create new session
- `Ctrl + /` - Focus chat input
- `Escape` - Exit fullscreen

## Color Palette

The application uses a muted/neutral color palette:

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#1a1a1a` | Main background |
| Surface | `#242424` | Cards, panels |
| Surface Elevated | `#2d2d2d` | Hovered surfaces |
| Border | `#3d3d3d` | Borders |
| Accent | `#6366f1` | Muted indigo |
| Error | `#dc2626` | Muted red |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

MIT

---

Built with Next.js, Playwright, and Claude AI
