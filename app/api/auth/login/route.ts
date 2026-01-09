import { NextResponse } from "next/server"
import { SignJWT } from "jose"

// Use environment variables or requested defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const JWT_SECRET = process.env.JWT_SECRET

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    console.log("LOGIN CHECK: Processing login request for:", email)

    // Direct comparison as requested
    if (email !== ADMIN_EMAIL) {
      console.log("LOGIN FAIL: Email mismatch")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (password !== ADMIN_PASSWORD) {
      console.log("LOGIN FAIL: Password mismatch")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate JWT
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ email, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret)

    const response = NextResponse.json({ success: true, token })
    
    // Set HTTP-only cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
