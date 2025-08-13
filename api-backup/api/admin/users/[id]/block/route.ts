import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number.parseInt(params.id)

    await sql`
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${userId}
    `

    // Cancel any pending conversions for this user
    await sql`
      UPDATE conversion_requests 
      SET status = 'cancelled', notes = 'User blocked by admin'
      WHERE user_id = ${userId} AND status IN ('pending', 'processing')
    `

    return NextResponse.json({ success: true, message: "User blocked successfully" })
  } catch (error) {
    console.error("Block user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization")
  const adminToken = process.env.ADMIN_TOKEN
  return authHeader === `Bearer ${adminToken}`
}
