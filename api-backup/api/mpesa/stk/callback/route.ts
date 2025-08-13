import { type NextRequest, NextResponse } from "next/server"
import { recordMpesaTransaction } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("STK Push callback received:", JSON.stringify(body, null, 2))
    
    const { Body } = body
    const { stkCallback } = Body
    
    if (stkCallback) {
      const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback
      
      // Extract transaction details
      let amount = 0
      let receiptNumber = ""
      let phoneNumber = ""
      
      if (CallbackMetadata?.Item) {
        CallbackMetadata.Item.forEach((item: any) => {
          if (item.Name === "Amount") amount = Number.parseInt(item.Value)
          if (item.Name === "MpesaReceiptNumber") receiptNumber = item.Value
          if (item.Name === "PhoneNumber") phoneNumber = item.Value
        })
      }
      
      // Record the STK transaction
      await recordMpesaTransaction({
        transactionType: "STK",
        mpesaReceiptNumber: receiptNumber,
        phoneNumber: phoneNumber,
        amount: amount,
        status: ResultCode === 0 ? "completed" : "failed",
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        rawResponse: body,
      })
      
      if (ResultCode === 0) {
        console.log(`STK Push successful: ${receiptNumber} for ${phoneNumber}`)
      } else {
        console.log(`STK Push failed: ${ResultDesc}`)
      }
    }
    
    return NextResponse.json({ message: "STK callback processed" })
  } catch (error) {
    console.error("STK callback error:", error)
    return NextResponse.json({ error: "Error processing STK callback" }, { status: 500 })
  }
}
