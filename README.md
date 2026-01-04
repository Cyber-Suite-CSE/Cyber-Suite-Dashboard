# CyberSuite: Offensive Security Web Domain Scanner

This project is a comprehensive web domain scanner consisting of a React/Next.js frontend and a Microservices-based backend running on Kubernetes.

## 📋 Prerequisites

- **Frontend**: Node.js (v18 or higher), npm
- **Backend**: Kubernetes Cluster (e.g., Minikube), Docker, kubectl

## 🚀 Quick Start Guide

You need to run both the Frontend and the Backend for the full application to work.

### 1. Run the Backend (Kubernetes)

The backend handles the scanning logic (Nmap, Katana, Wappalyzer).

1.  Navigate to the backend directory:
    ```bash
    cd ../web-domain-scanner
    ```

2.  Deploy to your Kubernetes cluster:
    ```bash
    # Apply configurations (Namespace, Redis, API Gateway, Workers)
    kubectl apply -f k8s/base/namespace.yaml
    kubectl apply -f k8s/base/redis.yaml
    kubectl apply -f k8s/base/api-gateway.yaml
    kubectl apply -f k8s/base/workers.yaml
    ```

3.  (Optional) Port Forwarding:
    If you are running locally (Minikube) and the LoadBalancer is pending, port-forward the API Gateway:
    ```bash
    kubectl port-forward -n web-scanner svc/api-gateway 5000:80
    ```

### 2. Run the Frontend (Next.js)

The frontend provides the dashboard for launching scans and viewing results.

1.  Navigate to the dashboard directory:
    ```bash
    cd Cyber-Suite-Dashboard  # If starting from root, otherwise you are here.
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Access the Dashboard:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Architecture

- **Cyber-Suite-Dashboard**: Next.js 14 App Router, React, Tailwind CSS.
- **web-domain-scanner**: Python 3.11 Microservices (Flask/Gunicorn), Redis Queue, Docker.
  - `api-gateway`: Orchestrates scans and manages state.
  - `domain-enumeration`: Subdomain finding (Gobuster).
  - `service-discovery`: Port scanning (Nmap).
  - `web-analysis`: Crawling and tech detection (Katana, Wappalyzer).
