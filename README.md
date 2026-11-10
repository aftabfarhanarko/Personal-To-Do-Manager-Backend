# TaskFlow — Modern SaaS To-Do Management System

A production-ready, full-stack personal task management application built with **Node.js**, **Express.js**, and modern **Vanilla JavaScript (HTML5/CSS3)**. Features clean **MVC architecture**, dual authentication (JWT + express-session), `bcrypt` password hashing, real-time User-Agent security audit logging, and a responsive SaaS dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [1. Modern SaaS Frontend](#1-modern-saas-frontend)
  - [2. Enterprise Security & Authentication](#2-enterprise-security--authentication)
  - [3. Security Auditing & User-Agent Tracking](#3-security-auditing--user-agent-tracking)
  - [4. Task Management (CRUD)](#4-task-management-crud)
  - [5. Middleware & Error Handling](#5-middleware--error-handling)
- [Project Architecture & Directory Structure](#project-architecture--directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
  - [System Endpoints](#system-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Activity & Audit Endpoints](#activity--audit-endpoints)
  - [To-Do Endpoints](#to-do-endpoints)
- [Data Storage & Log Schemas](#data-storage--log-schemas)
- [Automated Testing](#automated-testing)
- [Production Deployment Guidelines](#production-deployment-guidelines)
- [License](#license)

---

## Overview

TaskFlow is designed as a standalone, zero-external-database SaaS platform. It combines a robust Express.js backend with an accessible, high-performance Vanilla JavaScript Single-Page Application (SPA) that runs with zero build steps or heavy client-side frameworks.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser (SPA)                     │
│    HTML5 • CSS3 (SaaS Theme) • Vanilla JS (ES6+ Fetch API)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / Cookies
┌──────────────────────────────▼──────────────────────────────┐
│                   Express.js Application                    │
│  ├─ Request Logger (request-logs.json)                      │
│  ├─ Security Audit Logger (audit-logs.json)                 │
│  ├─ Cookie Parser & Express-Session (2-hour TTL)            │
│  ├─ Authentication Middleware (JWT + Session)               │
│  └─ Route Guards & Validation Middleware                    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│     Controllers & Models    │ │     JSON Persistence        │
│   • Auth (bcrypt + JWT)     │ │   • data/users.json         │
│   • Todos CRUD & Filter     │ │   • data/todos.json         │
│   • Activity & Audit Stream │ │   • data/blocked-users.json │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## Key Features

### 1. Modern SaaS Frontend
- **Zero Framework Dependency**: Built purely with HTML5, CSS3, and ES6+ Vanilla JavaScript. Fast initial load with zero client-side compilation required.
- **Dual-View Dashboard**:
  - **Task View**: Live metric cards (Total, Completed, Pending, Completion Rate), priority-based task creator, real-time search, status filter tabs (`All`, `Pending`, `Completed`), and modal delete confirmation.
  - **Activity & User-Agent View**: Live inspection stream showing all endpoints hit by the authenticated user, HTTP methods, status pills, latency, client IP, and human-readable parsed User-Agent tags alongside raw headers.
- **Polished UI/UX**:
  - Minimal white SaaS aesthetic with hairline borders and slate/cobalt accents.
  - Non-blocking toast notifications (Success, Info, Error).
  - Responsive mobile drawer navigation with backdrop blur.
  - Accessible forms with inline validation and password visibility toggles.
  - Skeleton placeholders for async data fetching.

### 2. Enterprise Security & Authentication
- **Dual Authentication**:
  - **JWT Tokens**: Signed using HS256 (`jsonwebtoken`) with a strict **2-hour expiration**. Can be sent via `Authorization: Bearer <token>` or HTTP-only cookies.
  - **Express Session**: Backed by secure `connect.sid` cookie with a **2-hour maximum age** (`maxAge: 7200000 ms`).
- **Cryptographic Password Hashing**: Uses `bcrypt` with 10 salt rounds. Compatible with backward-compatible legacy hash verification.
- **Sensitive Data Redaction**: Passwords and raw secrets are stripped from responses and sanitized from audit logs before file persistence.
- **Session Destruction**: `POST /api/auth/logout` completely invalidates the session and clears all authentication cookies.

### 3. Security Auditing & User-Agent Tracking
- **Audit Logger Middleware** (`middleware/auditLogger.js`):
  - Records every request into `logs/audit-logs.json` with unique UUID, timestamp, method, URL, status code, latency, IP, sanitized body, and client User-Agent.
  - Automatically bounds log size to the latest 1,000 records to prevent disk exhaustion.
- **Strict Multi-User Isolation**:
  - `getUserAuditLogs(userId)` filters records strictly by `entry.user.id === userId`.
  - Authenticated users can **never** view or leak other users' logs or anonymous hits.
- **Proactive Threat Blocking**:
  - Integrated blocking engine (`blockUser`, `unblockUser`, `isBlocked`).
  - Supports blocking by User ID, Email, or Client IP in `data/blocked-users.json`.
  - Blocked requests immediately receive a `403 Forbidden` response and are flagged in the audit log.
- **Request Logger** (`middleware/logger.middleware.js`):
  - Automatically logs every incoming request into `logs/request-logs.json`.

### 4. Task Management (CRUD)
- Create tasks with title, description, priority (`low`, `medium`, `high`), and optional due dates.
- List tasks filtered by user ownership, completion status, priority, and substring search queries.
- In-place task toggling (`PATCH /api/todos/:id/toggle`).
- Safe deletion with secondary confirmation modal.

### 5. Middleware & Error Handling
- **Route Validation Middleware** (`middleware/todos.middleware.js`):
  - `checkTodoRoute`: Validates whether the requested path exists before executing downstream logic. Rejects non-existent routes with standard `404 Not Found` JSON.
  - `checkTodoExists`: Pre-validates entity existence on ID-based routes (`/:id`).
  - `validateTodo`: Validates required fields, trimming strings and verifying priority values.
- **Centralized Error Handling** (`middleware/error.middleware.js`):
  - Structured 404 handler for unmatched routes.
  - Global error handler catching unhandled exceptions and returning sanitized error payloads.

---

## Project Architecture & Directory Structure

```
To-Do Manager-AS/
├── controllers/                  # Controller layer (business logic)
│   ├── auth.controllers.js      # Auth, Profile, and Activity controllers
│   └── todos.controllers.js     # Todo CRUD and query filtering
├── data/                         # Local JSON persistence store
│   ├── blocked-users.json       # Blocked IP and user registry
│   ├── todos.json               # Todo item records
│   └── users.json               # User profiles with hashed credentials
├── logs/                         # Structured log stores
│   ├── access.log               # Raw access log
│   ├── audit-logs.json          # Security audit entries
│   └── request-logs.json        # General HTTP request logs
├── middleware/                   # Express middleware modules
│   ├── auditLogger.js           # Security audit logger & blocking middleware
│   ├── auth.middleware.js       # JWT & session token verification
│   ├── error.middleware.js      # 404 & Centralized error handlers
│   ├── logger.middleware.js     # Console and JSON request logger
│   └── todos.middleware.js      # Todo route validation & existence checks
├── models/                       # Data access models
│   ├── todo.model.js            # Todo entity methods
│   └── user.model.js            # User entity methods & password verification
├── public/                       # Frontend static web application
│   ├── css/
│   │   └── style.css            # Responsive white-theme SaaS stylesheet
│   ├── js/
│   │   └── app.js               # Client application (Fetch API, DOM, Auth, View switching)
│   └── index.html               # Semantic Single-Page Application layout
├── router/                       # Express routing definitions
│   ├── auth.route.js            # /api/auth route definitions
│   └── todos.route.js           # /api/todos route definitions
├── tests/                        # Automated unit and integration test suite
│   └── app.test.js              # 32 comprehensive tests (node:test)
├── utils/                        # Utility helpers
│   └── auth.utils.js            # bcrypt hashing, JWT signing, and cookie helpers
├── .env                          # Local environment configuration
├── .env.example                  # Environment configuration template
├── .gitignore
├── app.js                        # Main Express server configuration & route mounting
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (compatible with Node v20, v22, v24)
- **npm**: v9.0.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aftabfarhanarko/Personal-To-Do-Manager-Backend.git
   cd "To-Do Manager-AS"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Copy the sample environment file and configure your secrets:

```bash
cp .env.example .env
```

Edit `.env` to customize settings:

```ini
# Server Port
PORT=3000

# Environment Mode: development | production | test
NODE_ENV=development

# JWT Secret Key
JWT_SECRET=super_secret_todo_manager_jwt_key_2026

# Session Secret Key
SESSION_SECRET=super_secret_session_key_2026
```

### Available Scripts

| Command | Description |
|---|---|
| `npm start` | Runs the server in production mode using `node app.js` |
| `npm run dev` | Runs the server in development mode with auto-reload using `nodemon` |
| `npm test` | Executes the complete automated test suite using `node --test` |

Once started, access the application in your browser at:
```
http://localhost:3000
```

---

## API Reference

### System Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Serves Frontend SPA (Browser) or returns API Status JSON (API client) | No |
| `GET` | `/health` | Server health check (uptime, operational status) | No |

---

### Authentication Endpoints

#### 1. Register User
- **Endpoint**: `POST /api/auth/register` (Alias: `POST /register`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "password123"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "name": "Alex Johnson",
        "email": "alex@example.com",
        "createdAt": "2026-11-10T01:00:00.000Z",
        "updatedAt": "2026-11-10T01:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

#### 2. Login User
- **Endpoint**: `POST /api/auth/login` (Alias: `POST /login`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "password123"
  }
  ```
- **Response (`200 OK`)**:
  - Sets HTTP-only `token` cookie (2-hour expiry).
  - Sets `connect.sid` session cookie (2-hour expiry).
  - Returns JWT token and user profile in JSON body.

#### 3. Get Current User Profile
- **Endpoint**: `GET /api/auth/me` (Alias: `GET /me`)
- **Headers**: `Authorization: Bearer <token>` or Cookie: `token=<jwt>` / `connect.sid=<sid>`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "name": "Alex Johnson",
        "email": "alex@example.com"
      }
    }
  }
  ```

#### 4. Logout User
- **Endpoint**: `POST /api/auth/logout` (Alias: `POST /logout`)
- **Response (`200 OK`)**:
  - Destroys server-side session.
  - Clears `connect.sid` and `token` cookies.

---

### Activity & Audit Endpoints

#### Get Authenticated User Activity
- **Endpoint**: `GET /api/auth/activity` (Aliases: `/api/auth/my-activity`, `/api/auth/user-agent-logs`)
- **Headers**: `Authorization: Bearer <token>` or active Session Cookie
- **Description**: Returns all requests initiated by the authenticated user's ID with full User-Agent, latency, and status details.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2026-11-10T01:25:00.000Z",
        "method": "GET",
        "url": "/api/todos",
        "ip": "127.0.0.1",
        "user": {
          "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
          "email": "alex@example.com"
        },
        "statusCode": 200,
        "durationMs": 3,
        "status": "SUCCESS",
        "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36..."
      }
    ]
  }
  ```

---

### To-Do Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/todos` | List all to-dos (supports query filtering) | Optional |
| `POST` | `/api/todos` | Create a new to-do | Optional / Recommended |
| `GET` | `/api/todos/:id` | Get single to-do by ID | Optional |
| `PUT` | `/api/todos/:id` | Full update of a to-do | Optional |
| `PATCH` | `/api/todos/:id` | Partial update of a to-do | Optional |
| `PATCH` | `/api/todos/:id/toggle` | Toggle completion status | Optional |
| `DELETE` | `/api/todos/:id` | Delete to-do | Optional |

#### Query Parameters for `GET /api/todos`:
- `completed`: Filter by status (`true` | `false`)
- `priority`: Filter by priority (`low` | `medium` | `high`)
- `search`: Substring search in task `title` and `description`
- `sortBy`: Field to sort (`createdAt` | `priority` | `dueDate` | `title`)
- `sortOrder`: Sorting direction (`asc` | `desc`)
- `userOnly`: When `true`, filters only tasks belonging to the authenticated user

---

## Data Storage & Log Schemas

All data is managed safely through local JSON files, avoiding heavy database setups while remaining production-viable for lightweight deployments:

### Data Files (`data/`)
- `data/users.json`: Registered users with unique UUIDs, usernames, emails, and bcrypt-hashed passwords.
- `data/todos.json`: Task items containing `id`, `title`, `description`, `priority`, `completed`, `userId`, `createdAt`, and `updatedAt`.
- `data/blocked-users.json`: Registry of blocked identifiers (User ID, Email, IP) with block reasons and timestamps.

### Log Files (`logs/`)
- `logs/audit-logs.json`: Security audit entries capturing user actions, sanitized request payloads, response status codes, latencies, and client User-Agent strings.
- `logs/request-logs.json`: High-throughput structured HTTP request logs.

---

## Automated Testing

TaskFlow includes a comprehensive automated test suite powered by Node.js's native test runner (`node:test`). Tests cover:
- Root content negotiation (serving SPA HTML to browsers vs. JSON to API callers).
- Health check endpoints and uptime tracking.
- Password hashing and duplicate email rejection.
- JWT token authentication and cookie-based authentication.
- Express session handling and cookie lifetime.
- Full To-Do CRUD workflows, queries, and filters.
- Strict 404 validation middleware for invalid subroutes.
- Audit logger structured persistence and user/IP blocking.
- User-Agent capture and strict multi-user log isolation.

Run all tests:
```bash
npm test
```

Test Results Output:
```text
✔ To-Do Manager API Suite (32 tests passed)
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ duration_ms ~700ms
```

---

## Production Deployment Guidelines

When deploying to a production server (Ubuntu/Debian, VPS, or Docker container):

1. **Environment Variables**:
   Ensure `NODE_ENV=production` is set and use a strong, unique secret for `JWT_SECRET` and `SESSION_SECRET`:
   ```bash
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=$(openssl rand -hex 32)
   SESSION_SECRET=$(openssl rand -hex 32)
   ```

2. **Process Management**:
   Use [PM2](https://pm2.keymetrics.io/) to manage and monitor the Node process:
   ```bash
   npm install -g pm2
   pm2 start app.js --name "taskflow-api"
   pm2 save
   pm2 startup
   ```

3. **Reverse Proxy (Nginx)**:
   Place Nginx in front of the application for SSL termination and static asset caching:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Directory Permissions**:
   Ensure the `data/` and `logs/` directories are writable by the application user:
   ```bash
   chmod -R 755 data logs
   ```

---

## License

This project is licensed under the [MIT License](LICENSE).
