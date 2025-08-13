import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the validation request
    console.log("C2B Validation received:", JSON.stringify(body, null, 2))
    
    // For C2B validation, we always accept the transaction
    // This is required by Safaricom for C2B registration
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: "Accepted" 
    })
  } catch (error) {
    console.error("C2B validation error:", error)
    return NextResponse.json({ 
      ResultCode: 1, 
      ResultDesc: "Error processing validation" 
    })
  }
}
