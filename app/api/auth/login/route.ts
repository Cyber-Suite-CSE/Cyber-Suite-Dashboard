import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
const JWT_SECRET = process.env.JWT_SECRET

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    console.log("LOGIN CHECK:");
    console.log("Email:", email);
    console.log("Expected Email:", ADMIN_EMAIL);
    console.log("Password Length:", password?.length);
    console.log("Hash Length:", ADMIN_PASSWORD_HASH?.length);
    
    // Explicit compare debug
    const bcryptCheck = await bcrypt.compare(password, ADMIN_PASSWORD_HASH || "");
    console.log("Bcrypt Check Result:", bcryptCheck);

    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH!)
    if (!isValid) {
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
