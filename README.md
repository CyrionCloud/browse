# 🤖 AutoBrowse - AI-Powered Browser Automation SaaS

> Automate web tasks using natural language with AI-powered browser control

## Overview

AutoBrowse is a SaaS platform that enables users to automate browser tasks through natural language commands powered by AI. It combines the power of Claude AI with browser automation frameworks to execute complex web tasks automatically.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Browser Automation:** browser-use, Playwright, Owl
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API (Sonnet 4.5)
- **Deployment:** Vercel (Frontend) + Railway (Backend)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies: `npm run install:all`
3. Configure environment variables (see `.env.example` files)
4. Setup Supabase database (run migrations)
5. Run development servers: `npm run dev`

### Development

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- WebSocket: ws://localhost:4000

## Project Structure

```
autobrowse-saas/
├── frontend/          # Next.js 14 application
├── backend/           # Express API server
├── shared/            # Shared TypeScript types
└── docs/              # Documentation
```

## Features

- ✅ Natural language task input
- ✅ Real-time browser automation
- ✅ Session management
- ✅ Pre-built automation skills
- ✅ Advanced agent configuration
- ✅ Usage analytics
- ✅ Multi-user authentication

## License

MIT
