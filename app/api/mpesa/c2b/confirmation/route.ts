import { type NextRequest, NextResponse } from "next/server"
import { getConversionRequestByReference, updateConversionRequest, recordMpesaTransaction } from "@/lib/database"
import { sendMoneyB2C } from "@/lib/mpesa"

// Parse Safaricom timestamp format (YYYYMMDDHHMMSS)
function parseTransTime(transTime: string): Date {
  try {
    const year = transTime.substring(0, 4)
    const month = transTime.substring(4, 6)
    const day = transTime.substring(6, 8)
    const hour = transTime.substring(8, 10)
    const minute = transTime.substring(10, 12)
    const second = transTime.substring(12, 14)
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
  } catch (error) {
    console.error("Error parsing TransTime:", transTime, error)
    return new Date() // Fallback to current time
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the incoming C2B confirmation
    console.log("C2B Confirmation received:", JSON.stringify(body, null, 2))

    const { TransAmount, MSISDN, TransID, TransTime, BusinessShortCode, BillRefNumber } = body

    // Validate required fields
    if (!TransAmount || !MSISDN || !TransID) {
      console.error("Missing required fields in C2B confirmation")
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing required fields" })
    }

    // Check if we've already processed this transaction (idempotency)
    try {
      const existingTransaction = await recordMpesaTransaction({
        transactionType: "C2B",
        mpesaReceiptNumber: TransID,
        phoneNumber: MSISDN,
        amount: Number.parseFloat(TransAmount),
        transactionDate: parseTransTime(TransTime),
        status: "completed",
        rawResponse: body,
      })

      if (!existingTransaction) {
        console.log("Transaction already processed:", TransID)
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" })
      }
    } catch (error) {
      console.error("Error checking idempotency:", error)
      // Continue processing even if idempotency check fails
    }

    // If there's a bill reference number, try to match it to a conversion request
    if (BillRefNumber) {
      try {
        const conversionRequest = await getConversionRequestByReference(BillRefNumber) as any

        if (conversionRequest) {
          // Verify the amount matches exactly
          if (conversionRequest.airtime_amount === Number.parseFloat(TransAmount)) {
            console.log(`Processing conversion request: ${BillRefNumber} for ${MSISDN}`)
            
            // Update conversion request as airtime received
            await updateConversionRequest(conversionRequest.id, {
              status: "processing",
              airtimeReceived: true,
              notes: `Airtime received via M-Pesa: ${TransID}`,
            })

            // Send money back to customer
            try {
              const b2cResponse = await sendMoneyB2C(
                conversionRequest.phone_number,
                conversionRequest.payout_amount,
                conversionRequest.reference_code,
              )

              if (b2cResponse.ResponseCode === "0") {
                await updateConversionRequest(conversionRequest.id, {
                  status: "completed",
                  mpesaSent: true,
                  mpesaTransactionId: b2cResponse.ConversationID,
                  completedAt: new Date(),
                })
                
                console.log(`✅ Successfully processed conversion: ${BillRefNumber}`)
              } else {
                console.error("B2C payment failed:", b2cResponse)
                await updateConversionRequest(conversionRequest.id, {
                  status: "failed",
                  notes: `B2C payment failed: ${b2cResponse.errorMessage || b2cResponse.ResultDesc || 'Unknown error'}`,
                })
              }
            } catch (error) {
              console.error("B2C payment error:", error)
              await updateConversionRequest(conversionRequest.id, {
                status: "failed",
                notes: `B2C payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              })
            }
          } else {
            console.log(`Amount mismatch for ${BillRefNumber}: expected ${conversionRequest.airtime_amount}, got ${TransAmount}`)
            // Still record the transaction but don't process conversion
          }
        } else {
          console.log(`No conversion request found for reference: ${BillRefNumber}`)
        }
      } catch (error) {
        console.error("Error processing conversion request:", error)
        // Don't fail the webhook if conversion processing fails
      }
    } else {
      console.log("No BillRefNumber in C2B confirmation")
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted and processed" })
  } catch (error) {
    console.error("C2B confirmation error:", error)
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Error processing request" })
  }
}
