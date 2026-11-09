# Personal To-Do Manager API (Backend)

A RESTful backend API for personal task management built with **Node.js** and **Express.js** following clean **MVC architecture**.

---

## Features

- **Authentication System**:
  - User registration (`POST /api/auth/register`)
  - User login (`POST /api/auth/login`)
  - Protected user profile (`GET /api/auth/me`)
  - Cryptographically secure password hashing (salt + `scrypt`)
  - Stateless HS256 JWT token authentication
- **To-Do Management (CRUD)**:
  - Create to-dos with title, description, priority, and due date (`POST /api/todos`)
  - List all to-dos (`GET /api/todos`)
  - Query filters: by completion status (`?completed=true`), priority (`?priority=high`), keyword search (`?search=learn`), and sorting (`?sortBy=createdAt&sortOrder=desc`)
  - Get a single to-do by ID (`GET /api/todos/:id`)
  - Update a to-do (`PUT/PATCH /api/todos/:id`)
  - Quick toggle completion status (`PATCH /api/todos/:id/toggle`)
  - Delete a to-do (`DELETE /api/todos/:id`)
- **Robust Architecture**:
  - Clean separation of concerns: Models, Controllers, Routers, Middleware, Utilities
  - Request logging middleware (console + `logs/access.log`)
  - Centralized 404 handler and global error handler
  - File-based JSON persistence (`data/todos.json`, `data/users.json`) with zero external database configuration required
  - Comprehensive automated test suite with Node's built-in test runner (`npm test`)

---

## Project Structure

```
To-Do Manager-AS/
├── controllers/               # Business logic & request handling
│   ├── auth.controllers.js   # Register, Login, Me handlers
│   └── todos.controllers.js  # Todos CRUD handlers
├── data/                      # Local JSON persistence store
│   ├── todos.json
│   └── users.json
├── middleware/                # Custom Express middlewares
│   ├── auth.middleware.js    # JWT token verification (mandatory & optional)
│   ├── error.middleware.js   # 404 & Central Error handlers
│   └── logger.middleware.js  # Request logging middleware
├── models/                    # Data models & storage logic
│   ├── todo.model.js         # Todo data access methods
│   └── user.model.js         # User data access methods
├── router/                    # Express route definitions
│   ├── auth.route.js         # /api/auth routes
│   └── todos.route.js        # /api/todos routes
├── tests/                     # Automated test suites
│   └── app.test.js
├── utils/                     # Helper functions
│   └── auth.utils.js         # Password hashing & JWT helpers
├── .env                       # Local environment variables
├── .env.example               # Environment variables template
├── .gitignore
├── app.js                     # Express app setup & route mounting
├── package.json
└── README.md
```

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended; developed on Node v24)
- npm

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/aftabfarhanarko/Personal-To-Do-Manager-Backend.git
cd "To-Do Manager-AS"
npm install
```

### 3. Environment Setup

Create a `.env` file from the provided `.env.example`:

```bash
cp .env.example .env
```

Default configuration in `.env`:

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=super_secret_todo_manager_jwt_key_2026
```

### 4. Running the Application

- **Production / Standard Mode**:
  ```bash
  npm start
  ```
- **Development Mode (with auto-reload via Nodemon)**:
  ```bash
  npm run dev
  ```
- **Running Automated Tests**:
  ```bash
  npm test
  ```

Once running, the server is accessible at `http://localhost:8000`.

---

## API Documentation

### Base URL

```
http://localhost:8000
```

### System Endpoints

| Method | Endpoint  | Description | Auth Required |
|--------|-----------|-------------|---------------|
| `GET`  | `/`       | API Overview & Available Endpoints | No |
| `GET`  | `/health` | Health Check (uptime, status) | No |

---

### Authentication Endpoints

#### 1. Register User
- **URL**: `POST /api/auth/register` (or `POST /register`)
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "createdAt": "2026-11-09T14:50:00.000Z",
        "updatedAt": "2026-11-09T14:50:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

#### 2. Login User
- **URL**: `POST /api/auth/login` (or `POST /login`)
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

#### 3. Get Current Profile
- **URL**: `GET /api/auth/me` (or `GET /me`)
- **Header**: `Authorization: Bearer <your_jwt_token>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "name": "Jane Doe",
        "email": "jane@example.com"
      }
    }
  }
  ```

---

### To-Do Endpoints

#### 1. Create a To-Do
- **URL**: `POST /api/todos` (or `POST /todos`)
- **Header** *(Optional)*: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "title": "Build REST API",
    "description": "Implement authentication and CRUD routes",
    "priority": "high",
    "dueDate": "2026-11-15"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Todo created successfully",
    "data": {
      "id": "3bbdfa5a-8d39-4841-8631-7b001a1d1d86",
      "title": "Build REST API",
      "description": "Implement authentication and CRUD routes",
      "priority": "high",
      "completed": false,
      "dueDate": "2026-11-15",
      "userId": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
      "createdAt": "2026-11-09T14:55:00.000Z",
      "updatedAt": "2026-11-09T14:55:00.000Z"
    }
  }
  ```

#### 2. Get All To-Dos
- **URL**: `GET /api/todos` (or `GET /todos`)
- **Query Parameters**:
  - `completed`: Filter by status (`true` or `false`)
  - `priority`: Filter by level (`low`, `medium`, `high`)
  - `search`: Keyword search in title and description
  - `sortBy`: Field to sort by (`createdAt`, `priority`, `dueDate`, `title`)
  - `sortOrder`: `asc` or `desc` (default: `desc`)
  - `userOnly`: Set `true` with auth token to retrieve only your to-dos
- **Example**: `GET /api/todos?completed=false&priority=high&search=REST`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "3bbdfa5a-8d39-4841-8631-7b001a1d1d86",
        "title": "Build REST API",
        "description": "Implement authentication and CRUD routes",
        "priority": "high",
        "completed": false,
        "dueDate": "2026-11-15",
        "userId": "e4b3e839-4fd4-4d8b-965a-0adba42f53d8",
        "createdAt": "2026-11-09T14:55:00.000Z",
        "updatedAt": "2026-11-09T14:55:00.000Z"
      }
    ]
  }
  ```

#### 3. Get To-Do by ID
- **URL**: `GET /api/todos/:id`

#### 4. Update a To-Do
- **URL**: `PUT /api/todos/:id` or `PATCH /api/todos/:id`
- **Body**: Any subset of `{ "title", "description", "priority", "dueDate", "completed" }`

#### 5. Toggle To-Do Completion Status
- **URL**: `PATCH /api/todos/:id/toggle`
- Automatically flips `completed` between `true` and `false`.

#### 6. Delete a To-Do
- **URL**: `DELETE /api/todos/:id`

---

## Quick Testing with cURL

```bash
# 1. Check health
curl http://localhost:8000/health

# 2. Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@example.com","password":"password123"}'

# 3. Create a Todo
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish homework","priority":"high"}'

# 4. Get Todos
curl http://localhost:8000/api/todos
```
