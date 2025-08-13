import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendMoneyB2C } from "@/lib/mpesa"
import { sendMoneyAirtel } from "@/lib/airtel"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversionId = Number.parseInt(params.id)

    // Get conversion details
    const conversion = await sql`
      SELECT * FROM conversion_requests 
      WHERE id = ${conversionId} AND status = 'failed'
    `

    if (conversion.length === 0) {
      return NextResponse.json({ error: "Conversion not found or not failed" }, { status: 404 })
    }

    const conv = conversion[0]

    // Update status to processing
    await sql`
      UPDATE conversion_requests 
      SET status = 'processing', notes = 'Admin retry initiated'
      WHERE id = ${conversionId}
    `

    // Retry the payout based on network
    try {
      let result
      if (conv.network === "safaricom") {
        result = await sendMoneyB2C(conv.phone_number, conv.payout_amount, conv.reference_code)
      } else {
        result = await sendMoneyAirtel(conv.phone_number, conv.payout_amount, conv.reference_code)
      }

      // Update status based on result
      if (
        (conv.network === "safaricom" && result.ResponseCode === "0") ||
        (conv.network === "airtel" && result.status?.code === "200")
      ) {
        await sql`
          UPDATE conversion_requests 
          SET status = 'completed', mpesa_sent = true, completed_at = NOW()
          WHERE id = ${conversionId}
        `
      } else {
        await sql`
          UPDATE conversion_requests 
          SET status = 'failed', notes = 'Admin retry failed'
          WHERE id = ${conversionId}
        `
      }

      return NextResponse.json({ success: true, message: "Retry initiated" })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await sql`
        UPDATE conversion_requests 
        SET status = 'failed', notes = ${"Admin retry error: " + errorMessage}
        WHERE id = ${conversionId}
      `
      throw error
    }
  } catch (error) {
    console.error("Retry conversion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization")
  const adminToken = process.env.ADMIN_TOKEN
  return authHeader === `Bearer ${adminToken}`
}
