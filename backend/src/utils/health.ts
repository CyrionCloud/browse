import { createClient } from '@supabase/supabase-js'
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
  const startTime = Date.now()
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

  const checks: Promise<void>[] = []

  checks.push(
    (async () => {
      const dbStart = Date.now()
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )
        const { error } = await supabase.from('profiles').select('id').limit(1).single()
        result.services.database = {
          status: error ? 'unhealthy' : 'healthy',
          latency: Date.now() - dbStart,
          error: error?.message,
        }
      } catch (error: any) {
        result.services.database = {
          status: 'unhealthy',
          latency: Date.now() - dbStart,
          error: error.message,
        }
      }
    })()
  )

  checks.push(
    (async () => {
      try {
        if (process.env.ANTHROPIC_API_KEY) {
          result.services.anthropic = { status: 'healthy' }
        } else {
          result.services.anthropic = {
            status: 'unhealthy',
            error: 'ANTHROPIC_API_KEY not configured',
          }
        }
      } catch (error: any) {
        result.services.anthropic = {
          status: 'unhealthy',
          error: error.message,
        }
      }
    })()
  )

  checks.push(
    (async () => {
      try {
        const browser = await chromium.launch({ headless: true })
        await browser.close()
        result.services.playwright = { status: 'healthy' }
      } catch (error: any) {
        result.services.playwright = {
          status: 'unhealthy',
          error: error.message,
        }
      }
    })()
  )

  await Promise.allSettled(checks)

  const hasUnhealthy = Object.values(result.services).some((s) => s.status === 'unhealthy')
  const hasDegraded = Object.values(result.services).some((s) => s.status === 'unhealthy')

  result.status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

  return result
}

export function formatHealthResponse(result: HealthCheckResult, totalLatency: number) {
  return {
    ...result,
    totalLatency,
  }
}
