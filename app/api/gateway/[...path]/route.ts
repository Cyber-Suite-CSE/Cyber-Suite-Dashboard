import { NextResponse } from "next/server"

const SERVICES: Record<string, string | undefined> = {
  "api-tester": process.env.API_TESTER_URL,
  "web-scanner": process.env.WEB_SCANNER_URL,
  // Add other services here
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, params);
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, params);
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, params);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, params);
}

async function handleRequest(req: Request, paramsPromise: Promise<{ path: string[] }>) {
  const { path } = await paramsPromise;

  if (!path || path.length === 0) {
    return NextResponse.json({ message: "API Gateway Root" }, { status: 400 });
  }

  const [serviceName, ...restPath] = path;
  const baseUrl = SERVICES[serviceName];

  if (!baseUrl) {
    console.error(`[Gateway] Error: Service '${serviceName}' not found. Configured services:`, Object.keys(SERVICES));
    return NextResponse.json({ message: `Service '${serviceName}' not found or configured` }, { status: 404 });
  }

  const targetUrl = `${baseUrl}/${restPath.join("/")}`;
  const allowBody = ["POST", "PUT", "PATCH"].includes(req.method);
  
  console.log(`[Gateway] Proxying ${req.method} request`);
  console.log(`[Gateway] From: /api/gateway/${path.join("/")}`);
  console.log(`[Gateway] To:   ${targetUrl}`);

  // Inject server-side token if available and client didn't provide one
  let authHeader = req.headers.get('Authorization');
  if (!authHeader && serviceName === 'api-tester') {
      // Use env var or default. In prod, ensure this env var is set in Dockerfile/docker-compose
      const token = process.env.API_AUTH_TOKEN; 
      if (!token) console.warn("API_AUTH_TOKEN not set");
      authHeader = token ? `Bearer ${token}` : ""; 
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization" : authHeader || ""
      },
      body: allowBody ? await req.text() : undefined,
    });

    console.log(`[Gateway] Response Status: ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Gateway] Internal Error:", error);
    return NextResponse.json({ message: "Internal Gateway Error" }, { status: 500 });
  }
}

// Add other methods as needed (PUT, DELETE, etc.)
