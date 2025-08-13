import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAdminToken, createAdminSession } from "@/lib/auth"

const loginSchema = z.object({
  token: z.string().min(1, "Admin token is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = loginSchema.parse(body)

    // Verify the admin token
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid admin token" 
      }, { status: 401 })
    }

    // Create JWT session
    const sessionToken = createAdminSession()

    // Create response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully"
    })

    // Set secure HTTP-only cookie
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error("Admin login error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid input data", 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
