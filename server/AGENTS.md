# Backend Overview

This server-side application is built with Node.js and Express, providing a RESTful API for the frontend. It handles user authentication, data persistence with MongoDB, and all business logic for the Overwatch Account Share application.

# Core Libraries

The key backend libraries used in this project are:

-   **Express**: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
-   **Mongoose**: An Object Data Modeling (ODM) library for MongoDB and Node.js. It manages relationships between data, provides schema validation, and is used to translate between objects in code and the representation of those objects in MongoDB.
-   **bcryptjs**: A library to help you hash passwords.
-   **jsonwebtoken**: An implementation of JSON Web Tokens.
-   **dotenv**: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.

# API Structure

The API is structured to separate concerns and maintain a clean codebase:

-   **Routes**: Defined in `server/routes`, these files map API endpoints to controller functions.
-   **Controllers**: Located in `server/controllers`, these files contain the business logic for each route.
-   **Middleware**: Found in `server/middleware`, these files contain functions that have access to the request and response objects, and the next middleware function in the application’s request-response cycle.
-   **Models**: Mongoose schema models are located in `server/models`.

# Authentication

Authentication is handled using JSON Web Tokens (JWT). Protected routes are secured using custom middleware:

-   `authMiddleware.js`: Verifies the JWT token and attaches the user to the request object.
-   `adminMiddleware.js`: Checks if the authenticated user has admin privileges.

# Build and Test Commands

-   **Run development server**: `npm run dev`
-   **Start in production**: `npm start`
-   **Setup admin user**: `npm run setup-admin`

# Terminal Command Guidelines

## Kilo Code Terminal Limitations
⚠️ **CRITICAL**: Once a command is executed in Kilo Code terminal, you cannot send inputs to it. Plan accordingly!

## Windows-Specific Background Process Management
**Important**: The `&` operator behavior depends on your shell:

- **Git Bash (Recommended)**: `&` runs processes in background (e.g., `npm run dev &`)
- **Windows CMD**: `&` is a command separator, use `start /B` instead (e.g., `start /B npm run dev`)

## Background Process Commands
**Important**: Use output redirection to capture logs and ensure the process stays in background.

- **Git Bash (Recommended)**: `cd server && node server.js > server.log 2>&1 &`
- **Windows CMD**: `start /B cmd /C "cd server && node server.js > server.log 2>&1"`
- **For debugging/testing**: Use extensive logging instead of interactive debugging
- **For one-time commands**: Run in foreground to see results immediately

**Output Redirection Explanation:**
- `> server.log`: Redirects standard output to server.log
- `2>&1`: Redirects error output to the same file as standard output
- `&`: Runs the entire command chain in the background

## Logging Strategy (Essential for Kilo Code)
- **Always implement comprehensive logging** before running servers in background
- **Use structured logging** with timestamps and context
- **Log all errors, warnings, and key operations**
- **Include request IDs** for tracing issues
- **Log performance metrics** for monitoring

## Log Reading Methods
- **Live log monitoring**: `tail -f logs/filename.log` or `tail -f server/logs/*.log`
- **Recent logs**: `tail -n 50 logs/filename.log` (last 50 lines)
- **Search logs**: `grep "ERROR" logs/*.log` or `grep "keyword" logs/*.log`
- **Log rotation**: Use `ls -la logs/` to see current log files

## Server-Specific Commands
- **Start server (Git Bash)**: `cd server && node server.js > server.log 2>&1 &`
- **Start server (Windows CMD)**: `start /B cmd /C "cd server && node server.js > server.log 2>&1"`
- **Check if running**: `ps aux | grep node` or `lsof -i :5000`
- **Stop server**: `pkill -f "node server.js"` or `kill PID`
- **View server logs**: `tail -f server.log` or `tail -f server/logs/combined-*.log`

## Development Workflow (Kilo Code Adapted)
1. **Implement logging first**: Ensure all critical paths have console.log/logger statements
2. **Start server in background**: `cd server && node server.js > server.log 2>&1 &`
3. **Monitor logs in separate terminal**: `tail -f server.log` or `tail -f server/logs/combined-*.log`
4. **Continue development work** while server runs (cannot interact with server terminal)
5. **Stop server when done**: `pkill -f "node server.js"`

## Debugging in Kilo Code Environment
- **Pre-implement debugging**: Add extensive logging before running
- **Use separate terminals**: One for server, one for log monitoring
- **Test in foreground first**: For critical debugging, run without `&` to see immediate output
- **Accept limitations**: Cannot switch from foreground to background once started

# Code Style Guidelines

There is no linter or formatter configured for the server-side code. Please maintain a consistent style with the existing code.

# Testing Instructions

There is currently no testing framework set up for this project.

# Environment Variables

The server relies on a `.env` file for configuration. This file is not committed to version control and must be created locally. It contains sensitive information such as:

-   Database connection string (`MONGO_URI`)
-   JWT secret (`JWT_SECRET`)

An example file is provided in `.env.example`.