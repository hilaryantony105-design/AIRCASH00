import { type NextRequest, NextResponse } from "next/server"
import { createConversionRequest, getSystemSetting } from "@/lib/database"
import { conversionRateLimit, withRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const createConversionSchema = z.object({
  phoneNumber: z.string().regex(/^(\+254|0)(1|7)\d{8}$/, "Invalid Kenyan phone number"),
  airtimeAmount: z.number().min(20).max(1000),
  network: z.enum(["safaricom", "airtel"]).default("safaricom"),
})

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, airtimeAmount, network } = createConversionSchema.parse(body)

    // Get network-specific settings
    const conversionRateKey = network === "safaricom" ? "default_conversion_rate" : "airtel_conversion_rate"
    const receiveNumberKey = network === "safaricom" ? "airtime_receive_number" : "airtel_receive_number"

    const conversionRate = Number.parseFloat(
      (await getSystemSetting(conversionRateKey)) || (network === "safaricom" ? "0.75" : "0.70"),
    )
    const payoutAmount = Math.floor(airtimeAmount * conversionRate)

    // Get network-specific receive number
    const airtimeReceiveNumber = await getSystemSetting(receiveNumberKey)
    
    if (!airtimeReceiveNumber) {
      console.error(`Missing ${receiveNumberKey} in system settings`)
      return NextResponse.json({ 
        success: false, 
        error: `System configuration error: ${receiveNumberKey} not found` 
      }, { status: 500 })
    }

    // Create conversion request with network info
    const conversionRequest = await createConversionRequest({
      phoneNumber,
      airtimeAmount,
      payoutAmount,
      conversionRate,
      network,
    }) as any

    return NextResponse.json({
      success: true,
      data: {
        reference: conversionRequest.reference_code,
        phoneNumber: conversionRequest.phone_number,
        airtimeAmount: conversionRequest.airtime_amount,
        payoutAmount: conversionRequest.payout_amount,
        conversionRate: conversionRequest.conversion_rate,
        network: conversionRequest.network,
        airtimeReceiveNumber,
        instructions: {
          step1: "Confirm your details above",
          step2: `Send exactly KES ${airtimeAmount} ${network} airtime to ${airtimeReceiveNumber}`,
          step3: `You will receive KES ${payoutAmount} via ${network === "safaricom" ? "M-Pesa" : "Airtel Money"} within 5 minutes`,
        },
      },
    })
  } catch (error) {
    console.error("Conversion creation error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid input data", 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}

// Export with rate limiting
export const POST = withRateLimit(handlePOST, conversionRateLimit)
