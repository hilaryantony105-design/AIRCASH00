import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'fallback-secret-key'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN

if (!ADMIN_TOKEN) {
  console.warn('⚠️ ADMIN_TOKEN not set in environment variables')
}

interface AdminTokenPayload {
  isAdmin: boolean
  exp: number
  iat: number
}

// Verify admin token and create JWT session
export function verifyAdminToken(token: string): boolean {
  if (!ADMIN_TOKEN || !token) return false
  return token === ADMIN_TOKEN
}

// Create JWT session token
export function createAdminSession(): string {
  const payload: Omit<AdminTokenPayload, 'exp' | 'iat'> = {
    isAdmin: true
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'aircash-pro'
  })
}

// Verify JWT session token
export function verifyAdminSession(sessionToken: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(sessionToken, JWT_SECRET, {
      issuer: 'aircash-pro'
    }) as AdminTokenPayload
    
    return payload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

// Check if user is authenticated admin (server-side)
export async function isAuthenticatedAdmin(): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('admin_session')?.value
    
    if (!sessionToken) return false
    
    const payload = verifyAdminSession(sessionToken)
    return payload?.isAdmin === true
  } catch (error) {
    console.error('Admin authentication check failed:', error)
    return false
  }
}

// Extract admin session from request
export function getAdminSessionFromRequest(request: NextRequest): AdminTokenPayload | null {
  const sessionToken = request.cookies.get('admin_session')?.value
  
  if (!sessionToken) return null
  
  return verifyAdminSession(sessionToken)
}
