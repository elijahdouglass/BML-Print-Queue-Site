@echo off
echo ========================================
echo   Print Job API - Project Setup
echo ========================================
echo.

echo Creating prisma directory...
if not exist "prisma" (
    mkdir prisma
    echo   Created prisma\
) else (
    echo   prisma\ already exists
)

echo.
echo Creating schema.prisma file...
(
echo // prisma/schema.prisma
echo.
echo generator client {
echo   provider = "prisma-client-js"
echo }
echo.
echo datasource db {
echo   provider = "mysql"
echo   url      = env^("DATABASE_URL"^)
echo }
echo.
echo model User {
echo   id        String     @id @default^(cuid^(^)^)
echo   name      String
echo   email     String     @unique
echo   discord   String?
echo   createdAt DateTime   @default^(now^(^)^)
echo   updatedAt DateTime   @updatedAt
echo   printJobs PrintJob[]
echo.
echo   @@map^("users"^)
echo }
echo.
echo model PrintJob {
echo   id                   String    @id @default^(cuid^(^)^)
echo   userId               String
echo   user                 User      @relation^(fields: [userId], references: [id], onDelete: Cascade^)
echo   partName             String
echo   quantity             Int       @default^(1^)
echo   color                String
echo   material             String
echo   userSuppliedMaterial Boolean   @default^(false^)
echo   specialInstructions  String?   @db.Text
echo   stlUrl               String    @db.Text
echo   status               JobStatus @default^(PENDING^)
echo   createdAt            DateTime  @default^(now^(^)^)
echo   updatedAt            DateTime  @updatedAt
echo   completedAt          DateTime?
echo.
echo   @@index^([userId]^)
echo   @@index^([status]^)
echo   @@index^([createdAt]^)
echo   @@map^("print_jobs"^)
echo }
echo.
echo enum JobStatus {
echo   PENDING
echo   IN_PROGRESS
echo   COMPLETED
echo   CANCELLED
echo   FAILED
echo }
) > prisma\schema.prisma

echo   Created prisma\schema.prisma

echo.
echo Creating .env.example file...
(
echo # Database Configuration
echo DATABASE_URL="mysql://root:password@localhost:3306/printjobs"
echo.
echo # Server Configuration
echo PORT=3000
echo NODE_ENV=development
echo.
echo # CORS Configuration
echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
echo.
echo # Optional: API Configuration
echo API_PREFIX=/api
) > .env.example

echo   Created .env.example

if not exist ".env" (
    echo.
    echo Creating .env file...
    copy .env.example .env >nul
    echo   Created .env
    echo.
    echo   IMPORTANT: Update .env with your MySQL password!
) else (
    echo.
    echo   .env already exists (not overwriting)
)

echo Setup complete!
echo Press any key to exit
pause >nul