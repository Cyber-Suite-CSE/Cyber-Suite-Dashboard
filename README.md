# Project Vigilion

Project Vigilion - Cyber Security Stream Students at Computer Science and Engineering Department, University of Moratuwa, Sri Lanka

A comprehensive Next.js security dashboard with multiple scanner tools including CVE scanner, code scanner, web domain scanner, API Test and database scanner.

## Features

- 🔍 **CVE Scanner** - Scan for Common Vulnerabilities and Exposures
- 💻 **Code Scanner** - Analyze source code for security issues
- 🌐 **Web Domain Scanner** - Domain and web application security assessment
- 🗄️ **Database Scanner** - Database security analysis
- ⚙️ **API Tester** - Test and validate API endpoints
- 📊 **Dashboard** - Centralized security monitoring interface

## 🔐 Authentication

This project uses a secure **API Gateway** pattern protected by JWT authentication via `middleware.ts`.

- **Login Page**: `/login`
- **Admin Email**: `admin@cybersec.cse`
- **Default Password**: `CyberSec2025@C$E` (Update in `.env`)

## 🚀 Getting Started

### Prerequisites

- **Node.js 22** or higher
- **pnpm** package manager
- **Docker** (optional, for containerized setup)

---

## 📦 Running Without Docker

### 1. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Development Server

```bash
# Start development server with hot reloads
pnpm dev

# Or using npm
npm run dev
```

**Access:** [http://localhost:3000](http://localhost:3000)

### 3. Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Or using npm
npm run build
npm start
```

---

## 🐳 Running With Docker

### Prerequisites for Docker

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)

### 🔧 Development with Docker (Hot Reloads)

```bash
# Start development container with hot reloads
docker-compose up dev

# Or build and start
docker-compose up dev --build
```

**Features:**

- ✅ Hot reloads enabled
- ✅ Volume mounting for live code changes
- ✅ Node.js 22 Alpine
- ✅ Port: [http://localhost:3000](http://localhost:3000)

**To stop:**

```bash
# Stop development container
docker-compose down
```

### 🚀 Production with Docker (Nginx)

```bash
# Start production container with Nginx
docker-compose up prod

# Or build and start
docker-compose up prod --build
```

**Features:**

- Multi-stage build (Next.js + Nginx)
- Static file serving with Nginx
- Gzip compression enabled
- Security headers configured
- Optimized caching strategies
- Port: [http://localhost:80](http://localhost:80)

**To stop:**

```bash
# Stop production container
docker-compose down
```

---

## 🛠️ Docker Commands Cheat Sheet

### Individual Container Management

**Development:**

```bash
# Build development image
docker build -f Dockerfile.dev -t project-vigilion:dev .

# Run development container
docker run -p 3000:3000 -v .:/app -v /app/node_modules project-vigilion:dev
```

**Production:**

```bash
# Build production image
docker build -f Dockerfile.prod -t project-vigilion:prod .

# Run production container
docker run -p 80:80 project-vigilion:prod
```

### Docker Compose Commands

```bash
# View logs
docker-compose logs dev
docker-compose logs prod

# Rebuild containers
docker-compose up --build

# Run in background (detached)
docker-compose up -d dev
docker-compose up -d prod

# Stop all containers
docker-compose down

# Remove containers and images
docker-compose down --rmi all

# View running containers
docker-compose ps
```

---

## 🏗️ Docker Architecture

### Development Setup (`Dockerfile.dev`)

- **Base:** Node.js 22 Alpine
- **Package Manager:** pnpm
- **Hot Reloads:** Enabled with file polling
- **Volume Mounting:** Source code mounted for live updates
- **Port:** 3000

### Production Setup (`Dockerfile.prod`)

- **Stage 1:** Node.js 22 Alpine (Build stage)
  - Builds Next.js static export
- **Stage 2:** Nginx Alpine (Runtime stage)
  - Serves static files
  - Optimized for performance
  - Security headers included
- **Port:** 80

---

### Production Issues

- **Nginx errors:** Check `nginx.conf` configuration
- **Build failures:** Ensure all dependencies are compatible with static export
