import { type NextRequest, NextResponse } from "next/server"
import { getConversionRequestByReference, updateConversionRequest, recordMobileTransaction } from "@/lib/database"
import { sendMoneyAirtel } from "@/lib/airtel"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Airtel callback received:", JSON.stringify(body, null, 2))

    const { transaction } = body

    if (!transaction) {
      console.error("No transaction data in Airtel callback")
      return NextResponse.json({ error: "No transaction data" }, { status: 400 })
    }

    const { id, status, amount, currency, reference, msisdn } = transaction

    // Validate required fields
    if (!id || !status || !amount || !msisdn) {
      console.error("Missing required fields in Airtel callback")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if we've already processed this transaction (idempotency)
    try {
      const existingTransaction = await recordMobileTransaction({
        transactionType: "AIRTEL_COLLECTION",
        mpesaReceiptNumber: id,
        phoneNumber: msisdn,
        amount: Number.parseFloat(amount),
        status: status === "TS" ? "completed" : "failed", // TS = Transaction Successful
        network: "airtel",
        rawResponse: body,
      })

      if (!existingTransaction) {
        console.log("Airtel transaction already processed:", id)
        return NextResponse.json({ message: "Transaction already processed" })
      }
    } catch (error) {
      console.error("Error checking Airtel idempotency:", error)
      // Continue processing even if idempotency check fails
    }

    // If successful and has reference, process conversion
    if (status === "TS" && reference) {
      try {
        const conversionRequest = await getConversionRequestByReference(reference) as any

        if (conversionRequest && conversionRequest.network === "airtel") {
          // Verify the amount matches exactly
          if (conversionRequest.airtime_amount === Number.parseFloat(amount)) {
            console.log(`Processing Airtel conversion request: ${reference} for ${msisdn}`)
            
            // Update conversion request as airtime received
            await updateConversionRequest(conversionRequest.id, {
              status: "processing",
              airtimeReceived: true,
              notes: `Airtel airtime received: ${id}`,
            })

            // Send money back to customer via Airtel Money
            try {
              const airtelResponse = await sendMoneyAirtel(
                conversionRequest.phone_number,
                conversionRequest.payout_amount,
                conversionRequest.reference_code,
              )

              if (airtelResponse.status?.code === "200") {
                await updateConversionRequest(conversionRequest.id, {
                  status: "completed",
                  mpesaSent: true,
                  mpesaTransactionId: airtelResponse.data?.transaction?.id,
                  completedAt: new Date(),
                })
                
                console.log(`✅ Successfully processed Airtel conversion: ${reference}`)
              } else {
                console.error("Airtel disbursement failed:", airtelResponse)
                await updateConversionRequest(conversionRequest.id, {
                  status: "failed",
                  notes: `Airtel disbursement failed: ${airtelResponse.message || 'Unknown error'}`,
                })
              }
            } catch (error) {
              console.error("Airtel disbursement error:", error)
              await updateConversionRequest(conversionRequest.id, {
                status: "failed",
                notes: `Airtel disbursement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              })
            }
          } else {
            console.log(`Amount mismatch for ${reference}: expected ${conversionRequest.airtime_amount}, got ${amount}`)
            // Still record the transaction but don't process conversion
          }
        } else {
          console.log(`No Airtel conversion request found for reference: ${reference}`)
        }
      } catch (error) {
        console.error("Error processing Airtel conversion request:", error)
        // Don't fail the webhook if conversion processing fails
      }
    } else if (status !== "TS") {
      console.log(`Airtel transaction failed with status: ${status}`)
    } else {
      console.log("No reference in successful Airtel transaction")
    }

    return NextResponse.json({ message: "Callback processed successfully" })
  } catch (error) {
    console.error("Airtel callback error:", error)
    return NextResponse.json({ error: "Error processing callback" }, { status: 500 })
  }
}
