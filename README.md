# Overwatch Account Share

A secure MERN stack application designed for sharing Overwatch account credentials within a trusted community. Features a modern glassmorphism UI, robust authentication system, comprehensive account management, and automated OTP fetching capabilities.

## About The Project

Overwatch Account Share provides a centralized and secure platform where users can add, manage, and share their Overwatch accounts with others. The application handles credentials securely, tracks sharing activities, and provides a clean user interface with cyberpunk aesthetics and glassmorphism design.

## Tech Stack

### Frontend Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI Design**: Glassmorphism theme with cyberpunk aesthetics
- **Package Manager**: pnpm
- **Key Features**: Server-side rendering, real-time WebSocket connections, CSRF protection

### Backend Stack
- **Runtime**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Socket.io for live OTP updates
- **Security**: Comprehensive middleware stack including rate limiting, input sanitization, CORS protection
- **Package Manager**: npm

### Key Dependencies
- **Frontend**: React 18, Next.js 14, Socket.io-client, Zod validation
- **Backend**: Express 4.21, Supabase client, Google APIs, Winston logging, Redis caching
- **Security**: Helmet, CORS, express-rate-limit, express-validator, CSRF protection

## Features

### 1. Authentication & User Management
- JWT-based authentication with token refresh
- Role-based access control (user/admin)
- User registration with approval system
- Secure password hashing with bcrypt
- Session management with CSRF protection

### 2. Overwatch Account Management
- CRUD operations for Overwatch accounts
- Account sharing system with email-based invitations
- Real-time credential access control
- Owner-based authorization system
- Account visibility with conditional credential display

### 3. OTP Service Integration
- **Google OAuth Integration**: Multi-account Google OAuth system
- **Automated OTP Fetching**: Real-time OTP extraction from Battle.net emails
- **WebSocket Updates**: Live OTP updates via Socket.io
- **Email Processing**: Automated Gmail API integration for OTP retrieval
- **Security**: Encrypted credential storage with AES-256-GCM

### 4. Admin Dashboard
- User management (suspend/activate users)
- Registration toggle system
- System settings management
- Activity monitoring and audit logging
- Admin-only endpoints with proper authorization

### 5. Security Features
- **CSRF Protection**: Double-submit cookie pattern
- **Rate Limiting**: Multi-tier rate limiting for different endpoints
- **Input Sanitization**: SQL injection protection and input validation
- **CORS Configuration**: Strict origin validation
- **Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: Comprehensive security event logging
- **HTTPS Enforcement**: Production HTTPS requirements

## Project Structure

```
overwatch-account-share/
├── client/                    # Next.js frontend
│   ├── app/                   # App Router pages
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utility functions and API client
│   ├── public/                # Static assets
│   └── styles/                # Global styles
├── server/                    # Node.js/Express backend
│   ├── config/                # Database configuration
│   ├── controllers/           # Business logic handlers
│   ├── middleware/            # Express middleware
│   ├── models/                # Database models
│   ├── routes/                # API route definitions
│   ├── services/              # Background services (OTP fetching)
│   ├── utils/                 # Utility functions
│   └── migrations/            # Database migrations
├── docker-compose.yml         # Production deployment
├── package.json               # Monorepo scripts
└── verify-production-fix.sh   # Deployment verification
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- pnpm package manager
- Supabase account and database
- Google Cloud Console account (for OTP service)

### Local Development Setup

```bash
# Clone the repository
git clone [repository-url]

# Install all dependencies
npm run install-all

# Start development servers (concurrently)
npm start

# Or start individually
npm run start-client    # Frontend only
npm run start-server    # Backend only
```

### Environment Variables

Create `.env` files in both `client/` and `server/` directories:

**Server Environment Variables:**
```bash
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google-auth/otp/callback
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
NODE_ENV=development
PORT=5001
```

**Client Environment Variables:**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

## Usage

### Authentication Flow
1. Register a new account or login with existing credentials
2. Admin approval required for new registrations (if enabled)
3. JWT token stored securely with CSRF protection

### Account Management
1. Add Overwatch accounts with Battle.net credentials
2. Link Google accounts for automated OTP fetching
3. Share accounts with other users via email invitations
4. Manage account visibility and access permissions

### OTP Service
1. Link Google account via OAuth
2. Automatic OTP extraction from Battle.net emails
3. Real-time OTP updates via WebSocket
4. Encrypted credential storage and retrieval

### Admin Features
1. Toggle user registration on/off
2. Manage user accounts (suspend/activate)
3. Monitor system activity and logs
4. Configure system-wide settings

## Deployment

### Docker Configuration
- **Multi-stage builds** for optimized production images
- **Non-root user execution** for security
- **Health checks** for container monitoring
- **Build-time environment variables** for Next.js

### Production Deployment with Docker Compose

```bash
# Build and start production containers
docker-compose up -d

# Verify deployment
./verify-production-fix.sh
```

### Manual Deployment
1. Build frontend: `npm run build-client`
2. Deploy server to Node.js hosting
3. Configure environment variables
4. Set up HTTPS and domain
5. Configure Supabase and Google OAuth

## API Documentation

Complete API documentation available in [`API_Specification.md`](API_Specification.md). Key endpoints include:

- **Authentication**: `/api/auth/*` - Login, register, token management
- **Accounts**: `/api/overwatch-accounts/*` - Account CRUD operations
- **Admin**: `/api/admin/*` - Admin-only management endpoints
- **Settings**: `/api/settings/*` - System configuration
- **Google Auth**: `/api/google-auth/*` - OAuth and OTP services

## Database Schema

Database schema and migration details available in [`supabase_schemas.md`](supabase_schemas.md). Key tables:

- **users**: User accounts and authentication
- **overwatch_accounts**: Overwatch account credentials
- **overwatch_account_allowed_users**: Account sharing relationships
- **user_google_accounts**: Linked Google accounts for OTP
- **system_settings**: Global configuration settings

## Security

### Authentication & Authorization
- JWT tokens with secure signing and validation
- Role-based access control (user/admin roles)
- Session management with CSRF protection
- Password hashing with bcrypt (10+ rounds)

### Data Protection
- AES-256-GCM encryption for sensitive credentials
- HTTPS enforcement in production
- Secure cookie configuration
- Input validation and sanitization

### API Security
- Rate limiting on all endpoints
- CORS with strict origin validation
- SQL injection protection
- XSS prevention measures
- Comprehensive audit logging

### Infrastructure Security
- Non-root Docker container execution
- Environment variable protection
- Database connection encryption
- Secure secret management

## Development

### Code Style
- **Frontend**: TypeScript with React functional components
- **Backend**: Node.js with Express, async/await patterns
- **Database**: Lowercase column names, camelCase API responses
- **Git**: Conventional commit messages

### Testing
- E2E testing with Playwright
- Unit tests for critical functions
- Integration tests for API endpoints
- Security testing and audit procedures

### Performance Optimization
- Frontend: Code splitting, image optimization, SSR
- Backend: Database query optimization, Redis caching
- Real-time: WebSocket connections for live updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with proper testing
4. Update documentation as needed
5. Submit pull request with detailed description

## License

This project is proprietary software. All rights reserved.

## Support

For technical support and questions:
- Review documentation in repository
- Check existing issues and solutions
- Contact development team for assistance

---

_For detailed technical specifications, see [API_Specification.md](API_Specification.md) and [supabase_schemas.md](supabase_schemas.md)._