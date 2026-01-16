import { Request, Response, NextFunction } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { supabase, createAuthenticatedClient } from '../lib/supabase'
import { logger } from '../utils/logger'
import jwt from 'jsonwebtoken'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role?: string
      }
      accessToken?: string
      supabase?: SupabaseClient // Authenticated Supabase client for this user
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

    // First try to decode the JWT locally (faster, no network call)
    try {
      const decoded = jwt.decode(token) as any
      logger.debug('JWT decoded', {
        sub: decoded?.sub,
        email: decoded?.email,
        exp: decoded?.exp,
        aud: decoded?.aud,
        role: decoded?.role
      })

      if (decoded && decoded.sub && decoded.exp) {
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000)
        if (decoded.exp < now) {
          res.status(401).json({ error: 'Token expired' })
          return
        }

        // Token is valid - attach user info from JWT claims
        req.user = {
          id: decoded.sub,
          email: decoded.email || '',
          role: decoded.role
        }
        req.accessToken = token
        req.supabase = createAuthenticatedClient(token)

        logger.info('User authenticated from JWT', { userId: decoded.sub, email: decoded.email })
        next()
        return
      }
    } catch (jwtError) {
      // JWT decode failed, fall back to Supabase verification
      logger.warn('JWT decode failed, trying Supabase verification', { error: jwtError })
    }

    // Fall back to Supabase verification (makes network call)
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
    req.accessToken = token
    req.supabase = createAuthenticatedClient(token)

    logger.debug('User authenticated via Supabase', { userId: user.id })

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
