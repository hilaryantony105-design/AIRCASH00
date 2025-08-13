import { NextResponse } from "next/server"
import Database from 'better-sqlite3'
import path from 'path'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get database connection
const dbPath = path.join(process.cwd(), 'aircash.db')
const db = new Database(dbPath)

export async function GET() {
  try {
    // Get total users
    const totalUsersResult = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
    const totalUsers = totalUsersResult?.count || 0

    // Get total conversions
    const totalConversionsResult = db.prepare('SELECT COUNT(*) as count FROM conversion_requests').get() as any
    const totalConversions = totalConversionsResult?.count || 0

    // Get total volume (completed conversions only)
    const totalVolumeResult = db.prepare(`
      SELECT COALESCE(SUM(airtime_amount), 0) as volume 
      FROM conversion_requests 
      WHERE status = 'completed'
    `).get() as any
    const totalVolume = totalVolumeResult?.volume || 0

    // Calculate success rate
    const successRateResult = db.prepare(`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND(
              CAST(COUNT(CASE WHEN status = 'completed' THEN 1 END) AS REAL) * 100.0 / COUNT(*), 
              2
            )
          ELSE 0
        END as rate 
      FROM conversion_requests
    `).get() as any
    const successRate = successRateResult?.rate || 0

    // Get pending transactions
    const pendingResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM conversion_requests 
      WHERE status IN ('pending', 'processing')
    `).get() as any
    const pendingTransactions = pendingResult?.count || 0

    // Get failed transactions
    const failedResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM conversion_requests 
      WHERE status = 'failed'
    `).get() as any
    const failedTransactions = failedResult?.count || 0

    // Get today's stats
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const todayStatsResult = db.prepare(`
      SELECT 
        COUNT(*) as conversions,
        COALESCE(SUM(airtime_amount), 0) as volume
      FROM conversion_requests 
      WHERE DATE(created_at) = ?
    `).get(today) as any
    
    const todayConversions = todayStatsResult?.conversions || 0
    const todayVolume = todayStatsResult?.volume || 0

    const stats = {
      totalUsers,
      totalConversions,
      totalVolume,
      successRate,
      pendingTransactions,
      failedTransactions,
      todayVolume,
      todayConversions,
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
