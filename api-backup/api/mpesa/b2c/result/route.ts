import { type NextRequest, NextResponse } from "next/server"
import { recordMpesaTransaction } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("B2C Result received:", JSON.stringify(body, null, 2))

    const result = body.Result
    const { ResultCode, ResultDesc, ConversationID, TransactionID, ResultParameters } = result

    // Extract transaction details from ResultParameters
    let transactionReceipt = ""
    let recipientNumber = ""
    let amount = 0

    if (ResultParameters?.ResultParameter) {
      ResultParameters.ResultParameter.forEach((param: any) => {
        if (param.Key === "TransactionReceipt") {
          transactionReceipt = param.Value
        } else if (param.Key === "ReceiverPartyPublicName") {
          recipientNumber = param.Value
        } else if (param.Key === "TransactionAmount") {
          amount = Number.parseFloat(param.Value)
        }
      })
    }

    // Record the B2C transaction
    await recordMpesaTransaction({
      transactionType: "B2C",
      mpesaReceiptNumber: transactionReceipt,
      phoneNumber: recipientNumber,
      amount: amount,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      status: ResultCode === 0 ? "completed" : "failed",
      rawResponse: body,
    })

    // Update conversion request if successful
    if (ResultCode === 0) {
      // You might need to find the conversion request by ConversationID or TransactionID
      // This depends on how you store the reference in your B2C request
    }

    return NextResponse.json({ message: "Result processed successfully" })
  } catch (error) {
    console.error("B2C result error:", error)
    return NextResponse.json({ error: "Error processing result" }, { status: 500 })
  }
}
