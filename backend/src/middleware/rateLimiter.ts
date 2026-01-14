import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimiterOptions {
  windowMs?: number
  maxRequests?: number
  message?: string
}

const DEFAULT_OPTIONS: Required<RateLimiterOptions> = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests, please try again later'
}

class RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store) {
      if (entry.resetTime < now) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { cleaned })
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

const store = new RateLimiterStore()

export function rateLimiter(options: RateLimiterOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use user ID if authenticated, otherwise use IP
    const key = req.user?.id || req.ip || 'anonymous'
    const now = Date.now()

    let entry = store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + opts.windowMs
      }
      store.set(key, entry)
    } else {
      // Increment count
      entry.count++
      store.set(key, entry)
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString())
    res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - entry.count).toString())
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())

    if (entry.count > opts.maxRequests) {
      logger.warn('Rate limit exceeded', { key, count: entry.count })
      res.status(429).json({ error: opts.message })
      return
    }

    next()
  }
}

// Stricter rate limiter for sensitive endpoints
export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many requests to this endpoint, please try again later'
})

// Lenient rate limiter for general endpoints
export const lenientRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  message: 'Too many requests, please slow down'
})
