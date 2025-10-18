# AGENTS.md: AI Collaboration Guide

## Project Overview

**Project Name:** Overwatch Account Share
**Description:** A secure MERN stack application for sharing Overwatch account credentials within the community. Features a modern glassmorphism UI design with Next.js frontend and Node.js/Express backend powered by Supabase.
**Primary Language:** JavaScript/TypeScript
**Framework/Stack:**
- Frontend: Next.js 14+ with App Router
- Backend: Node.js with Express
- Database: PostgreSQL via Supabase
- Authentication: JWT + bcrypt
- UI Framework: Tailwind CSS with shadcn/ui components
- Package Manager: pnpm (frontend), npm (backend)

## Project Structure

```
overwatch-account-share/
├── client/                    # Next.js frontend
│   ├── app/                   # App Router pages
│   │   ├── admin/           # Admin page
│   │   ├── dashboard/       # Dashboard page
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   └── ...              # Other routes
│   ├── components/          # Reusable UI components
│   │   ├── modals/          # Modal components
│   │   ├── transitions/     # Page transition animations
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Utility functions and API client
│   ├── public/              # Static assets
│   ├── styles/              # Global styles
│   ├── next.config.mjs      # Next.js configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json         # Frontend dependencies
│
├── server/                  # Node.js/Express backend
│   ├── config/             # Database and app configuration
│   ├── controllers/        # Business logic handlers
│   ├── middleware/         # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API route definitions
│   ├── services/          # Background services (OTP fetching)
│   ├── utils/             # Utility functions
│   ├── migrations/        # Database migrations
│   └── server.js          # Main server entry point
│
├── docker-compose.yml     # Production deployment
├── package.json           # Monorepo scripts
└── verify-production-fix.sh # Deployment verification
```

## Key Files and Their Purposes

### Configuration Files
- `package.json` (root): Manages monorepo scripts and shared dependencies
- `client/next.config.mjs`: Next.js configuration
- `client/tsconfig.json`: TypeScript configuration
- `server/.env`: Environment variables (DATABASE_URL, JWT_SECRET, etc.)

### Core Application Files
- `client/app/layout.tsx`: Root Next.js layout component
- `client/app/page.tsx`: Home page component
- `client/lib/utils.ts`: Utility functions
- `server/server.js`: Express server initialization
- `server/config/db.js`: Supabase database connection

### Database Schema
- Located in `supabase_schemas.md`
- Tables: users, overwatch_accounts, overwatch_account_allowed_users, email_services, settings

### API Documentation
- `API_Specification.md`: Complete API endpoint documentation
- Endpoints organized by: /api/auth, /api/dashboard, /api/overwatch-accounts, /api/admin

## Development Workflow

### Setup Instructions
```bash
# Install all dependencies
npm run install-all

# Start development servers
npm start  # Runs both client and server concurrently
```

### Common Commands
```bash
# Frontend commands
npm run start-client      # Start Next.js dev server
npm run build-client      # Build Next.js app
npm run lint-client       # Run ESLint on client

# Backend commands
npm run start-server      # Start Express server
npm run install-server    # Install server dependencies
```

### Git Workflow
- Standard monorepo workflow with all code in single repository
- Frontend and backend changes can be made simultaneously
- Use standard git commands for version control

## Architecture Decisions

### Frontend Architecture
- **Component Structure**: Atomic design with reusable UI components
- **State Management**: React hooks and context (no Redux currently)
- **Routing**: Next.js App Router with file-based routing
- **Rendering**: Server-side rendering (SSR) and static generation (SSG) capabilities
- **Styling**: Tailwind CSS utility-first approach with glassmorphism theme
- **API Communication**: Client-side API calls with potential for server components

### Backend Architecture
- **API Design**: RESTful endpoints with JWT authentication
- **Database**: Supabase (PostgreSQL) with lowercase column naming convention
- **Authentication**: JWT tokens with bcrypt password hashing
- **Middleware Stack**: 
  - Authentication (`authMiddleware`)
  - Admin authorization (`adminMiddleware`)
  - Rate limiting
  - Input sanitization
  - Performance monitoring

### Data Flow
1. Frontend makes API calls (client components) or fetches data (server components)
2. Backend validates JWT token via middleware
3. Controllers process business logic
4. Models interact with Supabase database
5. Response mapped from lowercase (DB) to camelCase (Frontend)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - User registration  
- `GET /me` - Get current user

### Dashboard (`/api/dashboard`)
- `GET /` - Get dashboard data (user stats, accounts, activity)

### Overwatch Accounts (`/api/overwatch-accounts`)
- `GET /` - List accounts
- `POST /` - Add new account
- `PUT /:id` - Update account
- `DELETE /:id` - Delete account
- `POST /:id/share` - Share account with user

### Admin (`/api/admin`)
- `GET /stats` - Admin statistics
- `GET /users` - List all users
- `PATCH /users/:id/status` - Update user status
- `GET /logs` - System activity logs

## Database Schema

### Users Table
- id (UUID, Primary Key)
- username (Text, Unique)
- email (Text, Unique)
- password (Text, hashed)
- role (Text, default: 'user')
- isAdmin (Boolean, default: false)
- createdAt/updatedAt (Timestamps)

### Overwatch Accounts Table
- id (UUID, Primary Key)
- accountTag (Text, Unique)
- accountEmail (Text)
- accountPassword (Text, encrypted)
- owner_id (UUID, Foreign Key to users)
- rank (Text)
- mainHeroes (Text Array)
- lastUsed (Timestamp)
- sharingStatus (Text)

### Junction Table
- overwatch_account_allowed_users
  - overwatch_account_id (Foreign Key)
  - user_id (Foreign Key)
  - Composite Primary Key

## Testing Strategy

### E2E Testing
- **Framework**: Playwright
- **Coverage**: Authentication flow, registration, dashboard access, API integration
- **Location**: `testsprite_tests/` directory

### Test Scenarios
1. User registration with validation
2. Login with JWT token verification
3. Dashboard data loading
4. Account CRUD operations
5. Admin panel access control

## Deployment Considerations

### Environment Variables
Required in production:
- `DATABASE_URL` - Supabase connection string
- `JWT_SECRET` - Secret for JWT signing
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `NODE_ENV` - Production/development flag
- `PORT` - Server port (default: 5000)

### Build Process
```bash
# Build frontend for production
npm run build-client

# Frontend output: client/dist
# Serve with any static file server

# Backend: Deploy server/ directory to Node.js host
# Ensure all environment variables are set
```

### Security Considerations
- All passwords hashed with bcrypt
- JWT tokens for session management
- CORS configured for specific origins
- Rate limiting on API endpoints
- Input sanitization middleware
- HTTPS required in production

## Code Style Guidelines

### Frontend Guidelines
- **Components**: Functional components with TypeScript
- **Naming**: PascalCase for components, camelCase for functions
- **Imports**: Absolute imports from `@/` alias
- **Styling**: Tailwind utility classes, avoid inline styles
- **Types**: Define interfaces for all props and API responses

### Backend Guidelines  
- **Controllers**: Async/await pattern with try-catch
- **Error Handling**: Consistent error response format
- **Validation**: Input validation on all endpoints
- **Database**: Lowercase column names, camelCase in responses
- **Logging**: Winston logger for production logs

### Git Commit Convention
```
type(scope): description

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style changes
- refactor: Code refactoring
- test: Test updates
- chore: Build/config changes
```

## Common Tasks

### Adding a New Page
1. Create page component in `client/app/[route-name]/page.tsx`
2. Next.js automatically handles routing based on file structure
3. Create corresponding API endpoints if needed
4. Update navigation in `Navigation.tsx`

### Adding API Endpoint
1. Define route in `server/routes/`
2. Implement controller in `server/controllers/`
3. Add middleware if authentication required
4. Update API documentation
5. Add TypeScript types in frontend

### Database Migration
1. Create migration file in `server/migrations/`
2. Follow naming: `YYYY-MM-DD-description.sql`
3. Apply with migration script
4. Update model files if schema changed

## Troubleshooting Guide

### Common Issues

#### Frontend Not Loading
- Check if backend server is running (port 5000)
- Verify API_URL in frontend configuration
- Check browser console for CORS errors

#### Authentication Failures
- Verify JWT_SECRET matches between restarts
- Check token expiration settings
- Ensure database has correct user schema

#### Database Connection Issues
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check network connectivity to Supabase
- Verify database migrations are applied

## Performance Optimization

### Frontend Optimizations
- Automatic code splitting via Next.js
- Image optimization with next/image component
- Server-side rendering and static generation
- Built-in performance optimizations
- Memoization for expensive computations

### Backend Optimizations
- Database query optimization
- Redis caching [INFERRED - Confidence: Medium] (redis dependency present)
- Compression middleware enabled
- Rate limiting to prevent abuse

## Contact and Resources

### Repository Links
- Main: [INFERRED - Confidence: Low] (Not specified in files)

### Documentation
- API Specification: `API_Specification.md`
- Implementation Plan: `Implementation_Plan.md`
- Changelog: `CHANGELOG.md`
- Database Schema: `supabase_schemas.md`

### Development Tools
- **Kilo Code**: AI-powered development environment
- **Playwright MCP**: E2E testing server
- **Supabase Dashboard**: Database management

## Notes for AI Agents

### Current State (as of last update)
- ✅ Backend-frontend integration complete
- ✅ E2E tests passing
- ✅ Database schema standardized to lowercase
- ✅ API responses mapped to camelCase for frontend
- ✅ Authentication flow working end-to-end
- ✅ Legacy code removed

### Priority Areas
1. **UI Polish**: Modal alignment fixes needed (see Implementation_Plan.md)
2. **Admin Features**: User registration toggle, create user functionality
3. **Page Transitions**: Planned triangle animation system
4. **Testing**: Expand test coverage beyond E2E basics

### Known Technical Debt
- No Redux/state management library (using React Context)

### Best Practices for Modifications
1. Always update both TypeScript types and backend responses
2. Maintain lowercase database columns, camelCase API responses
3. Test authentication flow after any auth-related changes
4. Run E2E tests before major commits
5. Update memory bank files after significant changes

---

*Last Updated: 2025-10-18*  
*Generated for: AI Agent Collaboration*  
*Confidence Levels: High (verified in code), Medium (strong inference), Low (assumed)*