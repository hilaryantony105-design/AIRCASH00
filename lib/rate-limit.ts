import { NextRequest, NextResponse } from "next/server"

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  message?: string
  keyGenerator?: (request: NextRequest) => string
}

// Default rate limit configuration
const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (request: NextRequest) => {
    // Use IP address as key
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'anonymous'
    return ip
  }
}

// Clean up expired entries
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Rate limiting function
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  return (request: NextRequest): NextResponse | null => {
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupExpiredEntries()
    }
    
    const key = config.keyGenerator!(request)
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    let record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 1,
        resetTime: now + config.windowMs
      }
      rateLimitStore.set(key, record)
      return null // Allow request
    }
    
    if (record.count >= config.max) {
      // Rate limit exceeded
      return NextResponse.json({
        success: false,
        error: config.message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': record.resetTime.toString(),
          'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
        }
      })
    }
    
    // Increment counter
    record.count++
    rateLimitStore.set(key, record)
    
    return null // Allow request
  }
}

// Specific rate limiters for different endpoints
export const conversionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 conversion attempts per 15 minutes per IP
  message: "Too many airtime conversion requests. Please wait before trying again."
})

export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 admin requests per 15 minutes
  message: "Too many admin requests. Please wait before trying again."
})

export const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 general requests per minute
  message: "Too many requests. Please slow down."
})

// Helper to add rate limiting to API routes
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limiter: (request: NextRequest) => NextResponse | null
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const limitResponse = limiter(request)
    if (limitResponse) {
      return limitResponse
    }
    
    return handler(request)
  }
}
