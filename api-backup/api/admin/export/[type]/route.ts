import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  try {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type } = params

    let csvData = ""
    let filename = ""

    if (type === "users") {
      const users = await sql`
        SELECT 
          u.phone_number,
          u.name,
          u.created_at,
          COUNT(cr.id) as total_conversions,
          COALESCE(SUM(cr.airtime_amount), 0) as total_volume
        FROM users u
        LEFT JOIN conversion_requests cr ON u.id = cr.user_id
        GROUP BY u.id, u.phone_number, u.name, u.created_at
        ORDER BY u.created_at DESC
      `

      csvData = "Phone Number,Name,Created At,Total Conversions,Total Volume\n"
      users.forEach((user) => {
        csvData += `${user.phone_number},${user.name || ""},${user.created_at},${user.total_conversions},${user.total_volume}\n`
      })
      filename = `users-${new Date().toISOString().split("T")[0]}.csv`
    } else if (type === "conversions") {
      const conversions = await sql`
        SELECT 
          reference_code,
          phone_number,
          network,
          airtime_amount,
          payout_amount,
          status,
          created_at,
          completed_at
        FROM conversion_requests
        ORDER BY created_at DESC
      `

      csvData = "Reference,Phone,Network,Airtime Amount,Payout Amount,Status,Created At,Completed At\n"
      conversions.forEach((conv) => {
        csvData += `${conv.reference_code},${conv.phone_number},${conv.network},${conv.airtime_amount},${conv.payout_amount},${conv.status},${conv.created_at},${conv.completed_at || ""}\n`
      })
      filename = `conversions-${new Date().toISOString().split("T")[0]}.csv`
    }

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization")
  const adminToken = process.env.ADMIN_TOKEN
  return authHeader === `Bearer ${adminToken}`
}
