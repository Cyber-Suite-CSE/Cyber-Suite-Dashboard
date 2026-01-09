import { NextResponse } from "next/server"

// Map of service names to backend URLs (mock for now)
const SERVICES: Record<string, string> = {
  "users": "http://localhost:3001",
  "data": "http://localhost:3002",
  // In a real scenario, this could be configured via ENV
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  
  if (!path || path.length === 0) {
    return NextResponse.json({ message: "API Gateway Root" })
  }

  const [service, ...rest] = path
  
  // Example proxy logic
  if (SERVICES[service]) {
    // In a real implementation:
    // 1. Construct target URL
    // 2. Forward request (headers, body, etc.)
    // 3. Return response
    return NextResponse.json({ 
      message: `Request forwarded to service: ${service}`,
      target_path: `/${rest.join("/")}`
    })
  }

  return NextResponse.json({ 
    message: "Gateway: generic handler", 
    path: path.join("/") 
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return NextResponse.json({ 
    message: "Gateway: POST received", 
    path: path ? path.join("/") : "root"
  })
}

// Add other methods as needed (PUT, DELETE, etc.)
