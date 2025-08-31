# Overwatch Account Share - Project AGENTS

## Project Overview

This project is a secure MERN stack application designed for sharing Overwatch account credentials among users. It features a React/Vite frontend for a modern user interface and a Node.js/Express backend to handle authentication, data storage, and API services.

## Repository Structure

This repository is a monorepo with the following structure:

-   [`/client`](client): Contains the React frontend application built with Vite.
-   [`/server`](server): Contains the Node.js backend server using Express.

Each sub-directory (`/client` and `/server`) has its own `AGENTS.md` file with more specific instructions and details relevant to that part of the application.

## Core Technologies

-   **MongoDB**: NoSQL database for storing user and account data.
-   **Express**: Backend web application framework for Node.js.
-   **React**: JavaScript library for building the user interface.
-   **Node.js**: JavaScript runtime for the server.
-   **Tailwind CSS**: Utility-first CSS framework for styling.
-   **shadcn/ui**: Re-usable UI components.

## Build and Test Commands

### Client (`/client`)

-   **Run development server**: `npm run dev`
-   **Build for production**: `npm run build`
-   **Lint code**: `npm run lint`
-   **Preview production build**: `npm run preview`

### Server (`/server`)

-   **Run development server**: `npm run dev`
-   **Start in production**: `npm start`
-   **Setup admin user**: `npm run setup-admin`

## Terminal Command Guidelines

### Kilo Code Terminal Limitations
⚠️ **CRITICAL**: Once a command is executed in Kilo Code terminal, you cannot send inputs to it. Plan accordingly!

### Windows-Specific Background Process Management
**Important**: The `&` operator behavior depends on your shell:

- **Git Bash (Recommended)**: `&` runs processes in background (e.g., `npm run dev &`)
- **Windows CMD**: `&` is a command separator, use `start /B` instead (e.g., `start /B npm run dev`)

### Background Process Commands
**Important**: Use output redirection to capture logs and ensure the process stays in background.

- **Git Bash (Recommended)**: `cd server && node server.js > server.log 2>&1 &`
- **Windows CMD**: `start /B cmd /C "cd server && node server.js > server.log 2>&1"`
- **For debugging/testing**: Use extensive logging instead of interactive debugging
- **For one-time commands**: Run in foreground to see results immediately

**Output Redirection Explanation:**
- `> server.log`: Redirects standard output to server.log
- `2>&1`: Redirects error output to the same file as standard output
- `&`: Runs the entire command chain in the background

### Logging Strategy (Essential for Kilo Code)
- **Always implement comprehensive logging** before running servers in background
- **Use structured logging** with timestamps and context
- **Log all errors, warnings, and key operations**
- **Include request IDs** for tracing issues
- **Log performance metrics** for monitoring

### Log Reading Methods
- **Live log monitoring**: `tail -f logs/filename.log` or `tail -f server/logs/*.log`
- **Recent logs**: `tail -n 50 logs/filename.log` (last 50 lines)
- **Search logs**: `grep "ERROR" logs/*.log` or `grep "keyword" logs/*.log`
- **Log rotation**: Use `ls -la logs/` to see current log files

### Server-Specific Commands
- **Start server (Git Bash)**: `cd server && node server.js > server.log 2>&1 &`
- **Start server (Windows CMD)**: `start /B cmd /C "cd server && node server.js > server.log 2>&1"`
- **Check if running**: `ps aux | grep node` or `lsof -i :5000`
- **Stop server**: `pkill -f "node server.js"` or `kill PID`
- **View server logs**: `tail -f server.log` or `tail -f server/logs/combined-*.log`

### Development Workflow (Kilo Code Adapted)
1. **Implement logging first**: Ensure all critical paths have console.log/logger statements
2. **Start server in background**: `cd server && node server.js > server.log 2>&1 &`
3. **Monitor logs in separate terminal**: `tail -f server.log` or `tail -f server/logs/combined-*.log`
4. **Continue development work** while server runs (cannot interact with server terminal)
5. **Stop server when done**: `pkill -f "node server.js"`

### Debugging in Kilo Code Environment
- **Pre-implement debugging**: Add extensive logging before running
- **Use separate terminals**: One for server, one for log monitoring
- **Test in foreground first**: For critical debugging, run without `&` to see immediate output
- **Accept limitations**: Cannot switch from foreground to background once started

## Code Style Guidelines

-   **Client**: The client-side code follows standard React and TypeScript conventions, enforced by ESLint. The configuration can be found in [`client/eslint.config.js`](client/eslint.config.js).
-   **Server**: The server-side code does not currently have a linter or formatter. Please maintain a consistent style with the existing code.

## Testing Instructions

Testing for this application should be performed exclusively using the Playwright MCP server. All tests should focus on browser automation tasks to simulate user interactions and verify application behavior.

### Recommended Tools

Use the following Playwright MCP tools for all testing activities:

-   `browser_navigate`: To navigate to different pages (e.g., login, dashboard, admin).
-   `browser_fill_form`: To fill in login forms or other input fields.
-   `browser_click`: To interact with buttons and links (e.g., login, logout, suspend).
-   `browser_snapshot`: To capture the state of the page for verification.

## MCP Server Usage

### Playwright MCP Server
- **Purpose**: Use the Playwright MCP server for all testing and debugging tasks that involve browser interaction.
- **Key Tools**:
    - `browser_navigate`: To navigate to different pages.
    - `browser_fill_form`: To fill in forms.
    - `browser_click`: To interact with UI elements.
    - `browser_snapshot`: To capture the state of the page for verification.

### Ref MCP Server
- **Purpose**: Use the Ref MCP server to search for documentation and read online articles.
- **Key Tools**:
    - `ref_search_documentation`: To find relevant documentation.
    - `ref_read_url`: To read the content of a URL.

### Brave Search MCP Server
- **Purpose**: Use the Brave Search MCP server for general web searches and to gather information from various online sources.
- **Key Tools**:
    - `brave_web_search`: To perform web searches.

## Security Considerations

-   The server uses `dotenv` to manage environment variables. A `.env.example` file is provided in the [`/server`](server) directory.
-   Authentication is handled with JWT, and middleware is in place for protecting routes.

## Getting Started

To get the application running locally, follow these steps:

1.  **Start the backend server:**
    ```bash
    cd server && npm install && npm start
    ```

2.  **Start the frontend client:**
    ```bash
    cd client && npm install && npm run dev
    ```