# AutoBrowse SaaS - Complete Autonomous Development Plan

## 📋 PROJECT OVERVIEW

**Project Name:** AutoBrowse - AI-Powered Browser Automation SaaS  
**Goal:** Build a production-ready MVP that allows users to automate browser tasks through natural language  
**Execution Mode:** Fully autonomous - designed for Claude Code to execute without human intervention

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Socket.IO Client
- Radix UI Components

**Backend:**
- Node.js + Express
- TypeScript
- Socket.IO (WebSocket)
- Playwright (Browser Control)
- browser-use (Open Source Framework)
- Owl Integration (from Camel AI)

**Database & Auth:**
- Supabase (PostgreSQL + Auth)

**AI:**
- Anthropic Claude API (Sonnet 4.5)

**Deployment:**
- Frontend: Vercel
- Backend: Railway/Fly.io

### Design System

**Colors:**
- Background: `#0a0a0a` (dark-bg)
- Surface: `#121212` (dark-surface)
- Elevated: `#1a1a1a` (dark-elevated)
- Border: `#2a2a2a` (dark-border)
- Primary (Cyan): `#00d9ff`
- Alert (Pink): `#ff0080`
- Success: `#00ff88`
- Warning: `#ffaa00`

**Typography:**
- Primary: Geist Mono
- Secondary: Geist Sans

### Key Features

1. Natural language task input via chat interface
2. Real-time browser automation with visual feedback
3. Session management and history
4. Pre-built automation skills
5. Advanced agent configuration
6. Usage analytics and monitoring
7. Multi-user support with authentication

---

## 🎯 PHASE 1: PROJECT INITIALIZATION

**Duration:** ~15 minutes  
**Steps:** 1-15

### Step 1: Create Root Project Structure

**Action:**
```bash
mkdir autobrowse-saas
cd autobrowse-saas
mkdir -p frontend backend shared docs
```

**Verification:** Check that all directories exist

---

### Step 2: Initialize Frontend (Next.js)

**Action:**
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**Selections:**
- TypeScript: Yes
- ESLint: Yes  
- Tailwind CSS: Yes
- App Router: Yes
- Import alias: @/*

**Note:** This creates the Next.js 14 project with App Router

---

### Step 3: Install Frontend Core Dependencies

**Action:**
```bash
# Navigate to frontend if not already there
cd frontend

# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared

# State & API
npm install zustand axios socket.io-client

# UI Components
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-slider

# Utilities
npm install class-variance-authority clsx tailwind-merge

# Markdown & Syntax
npm install react-markdown react-syntax-highlighter
npm install @types/react-syntax-highlighter -D

# Animation
npm install framer-motion

# Fonts
npm install geist
```

---

### Step 4: Initialize Backend Package

**Action:**
```bash
cd ../backend
npm init -y
```

**Result:** Creates `package.json` in backend directory

---

### Step 5: Install Backend Core Dependencies

**Action:**
```bash
# Web Framework
npm install express cors dotenv

# Database
npm install @supabase/supabase-js

# WebSocket
npm install socket.io

# Browser Automation
npm install playwright

# AI
npm install @anthropic-ai/sdk

# Logging
npm install winston

# TypeScript
npm install typescript @types/node @types/express @types/cors ts-node tsx -D

# Initialize TypeScript
npx tsc --init
```

---

### Step 6: Clone and Integrate browser-use

**Action:**
```bash
# Clone browser-use temporarily
git clone https://github.com/browser-use/browser-use.git temp-browser-use

# Copy relevant code to integration folder
mkdir -p src/integrations/browser-use
cp -r temp-browser-use/browser_use/* src/integrations/browser-use/

# Clone Owl temporarily  
git clone https://github.com/camel-ai/owl.git temp-owl

# Copy Owl integration
mkdir -p src/integrations/owl
cp -r temp-owl/owl/* src/integrations/owl/

# Clean up
rm -rf temp-browser-use temp-owl

# Install additional dependencies for browser-use
npm install opencv-wasm playwright-core
```

---

### Step 7: Setup Shared Types Package

**Action:**
```bash
cd ../shared
npm init -y
npm install typescript -D
npx tsc --init
```

**Result:** Shared type definitions package initialized

---

### Step 8: Configure TypeScript for Backend

**File:** `backend/tsconfig.json`

**Content:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 9: Configure Tailwind with Custom Theme

**File:** `frontend/tailwind.config.ts`

**Content:**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'dark-surface': '#121212',
        'dark-elevated': '#1a1a1a',
        'dark-border': '#2a2a2a',
        
        'primary': {
          50: '#e6ffff',
          100: '#b3f5ff',
          200: '#80ecff',
          300: '#4de2ff',
          400: '#1ad9ff',
          500: '#00d9ff',
          600: '#00b8d9',
          700: '#0097b3',
          800: '#00768c',
          900: '#005566',
        },
        
        'alert': {
          50: '#ffe6f0',
          100: '#ffb3d1',
          200: '#ff80b3',
          300: '#ff4d94',
          400: '#ff1a75',
          500: '#ff0080',
          600: '#d9006b',
          700: '#b30056',
          800: '#8c0041',
          900: '#66002c',
        },
        
        'success': {
          500: '#00ff88',
          600: '#00d973',
        },
        
        'warning': {
          500: '#ffaa00',
          600: '#d98f00',
        },
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

### Step 10: Setup Environment Variables Templates

**File:** `frontend/.env.local.example`

**Content:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

**File:** `backend/.env.example`

**Content:**
```env
# Server
PORT=4000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Browser
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
```

**Note:** Agent should prompt for these values or document that they need to be filled in

---

### Step 11: Create Shared Type Definitions

**File:** `shared/src/types.ts`

**Content:**
```typescript
// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {
  usage_quota: {
    monthly_sessions: number
    used_sessions: number
    max_concurrent_sessions: number
  }
  preferences: Record<string, any>
}

// ============================================
// SESSION TYPES
// ============================================

export type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type TaskType = 'research' | 'shopping' | 'job_search' | 'form_filling' | 'monitoring' | 'custom'

export interface BrowserSession {
  id: string
  user_id: string
  status: SessionStatus
  task_description: string
  task_type?: TaskType
  agent_config?: AgentConfig
  result?: any
  error_message?: string
  duration_seconds?: number
  actions_count: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

// ============================================
// AGENT TYPES
// ============================================

export interface AgentConfig {
  model: 'browser-use-llm' | 'claude-sonnet-4.5'
  maxSteps: number
  outputType: 'streaming' | 'batch'
  highlightElements: boolean
  hashMode: boolean
  thinking: boolean
  vision: boolean
  profile: string | null
  proxyLocation: string
  allowedDomains: string[]
  secrets: Record<string, string>
  enabledSkills: string[]
}

// ============================================
// MESSAGE TYPES
// ============================================

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    action?: string
    url?: string
    screenshot?: string
    error?: string
    [key: string]: any
  }
  created_at: string
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export type WSEventType = 
  | 'session_start'
  | 'session_update' 
  | 'session_complete'
  | 'action_executed'
  | 'browser_ready'
  | 'planning'
  | 'plan_ready'
  | 'action_complete'
  | 'task_complete'
  | 'error'
  | 'paused'
  | 'cancelled'

export interface WSEvent {
  type: WSEventType
  sessionId: string
  data: any
  timestamp: string
}

// ============================================
// BROWSER ACTION TYPES
// ============================================

export type ActionType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'extract'
  | 'wait'
  | 'screenshot'
  | 'select'
  | 'hover'
  | 'drag'
  | 'upload'
  | 'download'

export interface BrowserAction {
  id: string
  session_id: string
  action_type: ActionType
  target_selector?: string
  target_description?: string
  input_value?: string
  output_value?: string
  success: boolean
  error_message?: string
  duration_ms: number
  screenshot_url?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface ActionResult {
  success: boolean
  action: string
  target?: string
  value?: string
  screenshot?: Buffer | string
  error?: string
  duration: number
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  task_config: Record<string, any>
  status: 'saved' | 'scheduled' | 'running' | 'completed' | 'failed'
  schedule_cron?: string
  last_run_at?: string
  next_run_at?: string
  run_count: number
  created_at: string
  updated_at: string
}

// ============================================
// SKILL TYPES
// ============================================

export type SkillCategory = 'research' | 'shopping' | 'automation' | 'monitoring' | 'productivity' | 'social'

export interface Skill {
  id: string
  name: string
  slug: string
  description: string
  category: SkillCategory
  icon?: string
  prompt_template: string
  default_config: Record<string, any>
  is_active: boolean
  requires_pro: boolean
  created_at: string
  updated_at: string
}

export interface UserSkill {
  user_id: string
  skill_id: string
  enabled: boolean
  custom_config: Record<string, any>
  usage_count: number
  last_used_at?: string
  created_at: string
}

// ============================================
// ANALYTICS TYPES
// ============================================

export type AnalyticsEventType = 
  | 'session_created'
  | 'session_completed'
  | 'action_executed'
  | 'skill_used'
  | 'error_occurred'
  | 'quota_exceeded'

export interface UsageAnalytics {
  id: string
  user_id: string
  event_type: AnalyticsEventType
  event_data: Record<string, any>
  created_at: string
}

export interface SessionStats {
  total_sessions: number
  completed_sessions: number
  failed_sessions: number
  total_actions: number
  avg_duration_seconds: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
```

**File:** `shared/src/index.ts`

**Content:**
```typescript
export * from './types'
```

**File:** `shared/package.json` - Update scripts:

```json
{
  "name": "@autobrowse/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

---

### Step 12: Configure Package Scripts

**File:** `frontend/package.json` - Add to scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

**File:** `backend/package.json` - Add to scripts section:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

---

### Step 13: Create Root Monorepo Package.json

**File:** `package.json` (in root directory)

**Content:**
```json
{
  "name": "autobrowse-saas",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build --workspaces",
    "build:shared": "cd shared && npm run build",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "install:all": "npm install && npm install --workspaces",
    "clean": "rm -rf node_modules frontend/node_modules backend/node_modules shared/node_modules",
    "type-check": "npm run type-check --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

Install concurrently:
```bash
npm install
```

---

### Step 14: Initialize Git Repository

**Action:**
```bash
cd .. # Go to root if not already there
git init
```

**File:** `.gitignore`

**Content:**
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env*.local
.env.production

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS
.DS_Store
*.swp
*.swo
*~
Thumbs.db

# IDE
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Misc
.vercel
.turbo
temp-browser-use/
temp-owl/

# Backend specific
backend/logs/

# Playwright
playwright-report/
test-results/
