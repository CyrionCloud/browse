import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role?: string
      }
    }
  }
}

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.substring(7)

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      logger.warn('Invalid auth token', { error: error?.message })
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role
    }

    logger.debug('User authenticated', { userId: user.id })

    next()
  } catch (error) {
    logger.error('Authentication error', { error })
    res.status(500).json({ error: 'Authentication failed' })
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  authenticateUser(req, res, next)
}
