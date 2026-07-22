import { Request, Response, NextFunction } from 'express'
import { verifyToken } from './utils'
import { AuthRequest } from './type' // আপনার টাইপ ফাইল

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Authentication required. No token provided.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyToken(token)
    req.userId = payload.userId
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// Global Error Handler
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Server Error:', err)
  res.status(500).json({ error: 'Internal server error.' })
}
