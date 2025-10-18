# Overwatch Account Share

A secure MERN stack application for sharing Overwatch account credentials within a trusted community. Features a modern glassmorphism UI, robust authentication, and a clean RESTful API.

## Features

*   Secure account sharing with encrypted credentials
*   Role-based access (admin/user)
*   Modern UI with glassmorphism theme
*   RESTful API endpoints for all core actions
*   Admin dashboard for user and account management

## Tech Stack

*   **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
*   **Backend:** Node.js, Express, Supabase (PostgreSQL)
*   **Auth:** JWT, bcrypt
*   **Database:** Supabase (PostgreSQL)

## Project Structure

```
overwatch-account-share/
├── client/      # Next.js frontend
├── server/      # Node.js/Express backend
├── package.json # Monorepo scripts
└── sync-submodules.sh # Submodule sync script
```

## Setup & Usage

```bash
# Clone with submodules
git clone --recursive [repository-url]

# Install dependencies
npm run install-all

# Start development servers
npm start
```

## API & Database

*   See `API_Specification.md` for endpoint details
*   See `supabase_schemas.md` for database schema

## Security Highlights

*   Passwords hashed with bcrypt
*   JWT session management
*   CORS and rate limiting
*   Input sanitization

## Contact

*   Client: https://github.com/Qiiks/glass-hero-hub.git
*   Server: https://github.com/Qiiks/Overwatch-Account-Share-Backend.git

---

_For technical details, see API_Specification.md and supabase_schemas.md._