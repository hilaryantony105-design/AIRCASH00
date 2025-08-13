import { type NextRequest, NextResponse } from "next/server"
import Database from 'better-sqlite3'
import path from 'path'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get database connection
const dbPath = path.join(process.cwd(), 'aircash.db')
const db = new Database(dbPath)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const users = db.prepare(`
      SELECT 
        u.id,
        u.phone_number,
        u.name,
        u.created_at,
        u.is_active,
        COUNT(cr.id) as total_conversions,
        COALESCE(SUM(CASE WHEN cr.status = 'completed' THEN cr.airtime_amount ELSE 0 END), 0) as total_volume,
        MAX(cr.created_at) as last_activity
      FROM users u
      LEFT JOIN conversion_requests cr ON u.id = cr.user_id
      GROUP BY u.id, u.phone_number, u.name, u.created_at, u.is_active
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset)

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      phoneNumber: user.phone_number,
      name: user.name,
      totalConversions: user.total_conversions,
      totalVolume: user.total_volume,
      lastActivity: user.last_activity || user.created_at,
      status: user.is_active ? "active" : "inactive",
      createdAt: user.created_at,
    }))

    return NextResponse.json({ success: true, data: formattedUsers })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
