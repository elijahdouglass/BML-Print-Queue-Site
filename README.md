# 3D Print Job Management API

A RESTful API built with TypeScript, Express, and Prisma for managing 3D print jobs.

## Features

- ✅ Create, read, update, and delete print jobs
- ✅ User management with automatic creation
- ✅ Job status tracking (PENDING, IN_PROGRESS, COMPLETED, CANCELLED, FAILED)
- ✅ Filter and sort jobs
- ✅ Job statistics
- ✅ Full TypeScript support
- ✅ Input validation with Zod
- ✅ MySQL database with Prisma ORM

## Prerequisites

- Node.js (v18 or higher)
- MySQL database
- npm or yarn

## Setup

### 1. Clone and Install

```bash
cd print-job-api
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update your `.env` file:

```env
DATABASE_URL="mysql://user:password@localhost:3306/printjobs"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status and uptime.

### Print Jobs

#### Create a new print job

```http
POST /api/jobs
Content-Type: application/json

{
  "userName": "Yuchao Wang",
  "userEmail": "wang3368@example.com",
  "userDiscord": "wang3368",
  "partName": "Gridfinity_BP_6x4",
  "quantity": 1,
  "color": "Grey",
  "material": "PLA",
  "userSuppliedMaterial": false,
  "specialInstructions": "N/A",
  "stlUrl": "https://example.com/file.stl"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "partName": "Gridfinity_BP_6x4",
    "quantity": 1,
    "status": "PENDING",
    "user": {
      "id": "clxxx...",
      "name": "Yuchao Wang",
      "email": "wang3368@example.com"
    },
    ...
  },
  "message": "Print job created successfully"
}
```

#### Get all print jobs

```http
GET /api/jobs
GET /api/jobs?status=PENDING
GET /api/jobs?userId=clxxx...
GET /api/jobs?sortBy=createdAt&sortOrder=desc
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

#### Get a specific print job

```http
GET /api/jobs/:id
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "partName": "Gridfinity_BP_6x4",
    ...
  }
}
```

#### Update a print job

```http
PATCH /api/jobs/:id
Content-Type: application/json

{
  "quantity": 2,
  "color": "Red",
  "status": "IN_PROGRESS"
}
```

**Response:** 200 OK

#### Update print job status only

```http
PATCH /api/jobs/:id/status
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

**Response:** 200 OK

#### Delete a print job

```http
DELETE /api/jobs/:id
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Print job deleted successfully"
}
```

#### Delete ALL print jobs (⚠️ Use with caution!)

```http
DELETE /api/jobs?confirm=true
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Successfully deleted 10 print jobs",
  "deletedCount": 10
}
```

#### Get job statistics

```http
GET /api/jobs/stats
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "total": 25,
    "byStatus": {
      "pending": 5,
      "inProgress": 3,
      "completed": 15,
      "cancelled": 1,
      "failed": 1
    }
  }
}
```

#### Get jobs by user

```http
GET /api/users/:userId/jobs
```

**Response:** 200 OK

## Database Schema

### User
- `id` - Unique identifier
- `name` - User's name
- `email` - User's email (unique)
- `discord` - Discord username (optional)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

### PrintJob
- `id` - Unique identifier
- `userId` - Reference to User
- `partName` - Name of the part
- `quantity` - Number of parts
- `color` - Color of the material
- `material` - Material type (PLA, ABS, etc.)
- `userSuppliedMaterial` - Boolean
- `specialInstructions` - Optional instructions
- `stlUrl` - URL to STL file
- `status` - Job status (enum)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp
- `completedAt` - Completion timestamp (optional)

## Status Values

- `PENDING` - Job is waiting to be started
- `IN_PROGRESS` - Job is currently being printed
- `COMPLETED` - Job has been completed
- `CANCELLED` - Job was cancelled
- `FAILED` - Job failed

## Development

### Prisma Studio

To view and edit your database with a GUI:

```bash
npm run prisma:studio
```

### Generate Prisma Client

After modifying the schema:

```bash
npm run prisma:generate
```

### Create a new migration

```bash
npm run prisma:migrate
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [] // Optional validation errors
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## License

MIT