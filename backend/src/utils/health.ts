import { chromium } from 'playwright'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string }
    anthropic: { status: 'healthy' | 'unhealthy'; error?: string }
    playwright: { status: 'healthy' | 'unhealthy'; error?: string }
  }
  version: string
  uptime: number
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unhealthy' },
      anthropic: { status: 'unhealthy' },
      playwright: { status: 'unhealthy' },
    },
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    result.services.database = {
      status: 'unhealthy',
      error: 'Supabase credentials not configured',
    }
  } else {
    const dbStart = Date.now()
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })
      result.services.database = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - dbStart,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      }
    } catch (error: any) {
      result.services.database = {
        status: 'unhealthy',
        latency: Date.now() - dbStart,
        error: error.message,
      }
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    result.services.anthropic = { status: 'healthy' }
  } else {
    result.services.anthropic = {
      status: 'unhealthy',
      error: 'ANTHROPIC_API_KEY not configured',
    }
  }

  try {
    await chromium.launch({ headless: true })
    result.services.playwright = { status: 'healthy' }
  } catch (error: any) {
    result.services.playwright = {
      status: 'unhealthy',
      error: error.message.includes('Executable') 
        ? 'Playwright browsers not installed. Run: npx playwright install'
        : error.message,
    }
  }

  const unhealthyCount = Object.values(result.services).filter(s => s.status === 'unhealthy').length
  const degradedCount = Object.values(result.services).filter(s => s.status === 'unhealthy').length

  result.status = unhealthyCount > 1 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy'

  return result
}
