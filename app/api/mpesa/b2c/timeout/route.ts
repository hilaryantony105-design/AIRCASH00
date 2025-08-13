import { type NextRequest, NextResponse } from "next/server"
import { recordMpesaTransaction } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("B2C Timeout received:", JSON.stringify(body, null, 2))
    
    const { Result } = body
    const { ResultCode, ResultDesc, ConversationID } = Result
    
    // Record the timeout transaction
    await recordMpesaTransaction({
      transactionType: "B2C",
      phoneNumber: "unknown", // We don't have phone number in timeout
      amount: 0, // We don't have amount in timeout
      status: "timeout",
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      rawResponse: body,
    })
    
    console.log(`B2C request timed out: ${ConversationID}`)
    
    return NextResponse.json({ message: "B2C timeout processed" })
  } catch (error) {
    console.error("B2C timeout error:", error)
    return NextResponse.json({ error: "Error processing timeout" }, { status: 500 })
  }
}
