# Cyber Suite Dashboard

The **Cyber Suite Dashboard** is the central user interface and API Gateway for the Cyber Suite CSE platform. Built with **Next.js**, it provides a unified experience for managing security scans, viewing results, and configuring the system.

## Key Features

*   **Unified Interface**: detailed views for Web Domain Scanning, Database Security, and API Testing.
*   **API Gateway**: Acts as a reverse proxy, routing API requests (`/api/gateway/...`) to the appropriate backend microservices on the internal Docker network.
*   **Real-time Updates**: Supports WebSocket connections for live scan progress (e.g., from the Database Scanner).
*   **Authentication**: Secure login system handling user sessions and access control.

## Tech Stack

*   **Framework**: Next.js 15 (App Router)
*   **Styling**: Tailwind CSS & Shadcn UI
*   **Language**: TypeScript

## Configuration

The dashboard connects to backend services via environment variables.
*   **Local Dev**: Uses `.env`
*   **Production**: Controlled via `Deployment-Repo/env/dashboard/.env`

Key inputs include:
*   `DATABASE_SCANNER_URL`: Internal URL for the DB Scanner REST API.
*   `NEXT_PUBLIC_DATABASE_SCANNER_WEB_SOCKET_URL`: Public URL for DB Scanner WebSockets.
*   `API_TESTER_URL`: Internal URL for the API Tester.
*   `WEB_SCANNER_URL`: Internal URL for the Web Domain Scanner.

## Running Locally

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:3000`.

## Docker

The dashboard is fully containerized for production deployment.
```bash
docker build -f Dockerfile.prod -t registry/cyber-suite-dashboard .
```
