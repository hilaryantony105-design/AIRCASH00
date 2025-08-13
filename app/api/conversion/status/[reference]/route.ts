import { type NextRequest, NextResponse } from "next/server"
import { getConversionRequestByReference } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { reference: string } }) {
  try {
    const reference = params.reference

    const conversionRequest = await getConversionRequestByReference(reference) as any

    if (!conversionRequest) {
      return NextResponse.json({ success: false, error: "Conversion request not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: conversionRequest.reference_code,
        status: conversionRequest.status,
        phoneNumber: conversionRequest.phone_number,
        airtimeAmount: conversionRequest.airtime_amount,
        payoutAmount: conversionRequest.payout_amount,
        airtimeReceived: conversionRequest.airtime_received,
        mpesaSent: conversionRequest.mpesa_sent,
        mpesaTransactionId: conversionRequest.mpesa_transaction_id,
        createdAt: conversionRequest.created_at,
        completedAt: conversionRequest.completed_at,
      },
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
