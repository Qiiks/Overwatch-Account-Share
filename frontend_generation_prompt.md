# AI Frontend Generation Prompt: Secure Credential & OTP Sharing Web Application

## 1. Project Overview

You are tasked with generating the complete frontend for a secure credential and OTP (One-Time Password) sharing web application. This application allows users to manage, share, and access sensitive account credentials and OTPs in a secure, user-friendly environment. The frontend should be a modern, responsive, and visually stunning web application that provides a professional and trustworthy user experience using Next.js.

## 2. Core Frontend Requirements

-   **Technology Stack**:
    -   **Framework**: Next.js 14+ with App Router
    -   **Language**: TypeScript
    -   **Styling**: Tailwind CSS for utility-first styling
    -   **UI Components**: Utilize `shadcn/ui` for the base component library
    -   **Package Manager**: pnpm for dependency management
-   **Application Structure and Routing**:
    -   Uses Next.js App Router with the `app/` directory structure
    -   Key routes include:
        -   `/`: Index/Landing page (`app/page.tsx`)
        -   `/login`: User login (`app/login/page.tsx`)
        -   `/register`: New user registration (`app/register/page.tsx`)
        -   `/forgot-password`: Password recovery (`app/forgot-password/page.tsx`)
        -   `/dashboard`: User dashboard for credential and OTP management (`app/dashboard/page.tsx`)
        -   `/admin`: Administrator panel (restricted access) (`app/admin/page.tsx`)
        -   `/terms`: Terms of Service page (`app/terms/page.tsx`)
        -   `/privacy`: Privacy Policy page (`app/privacy/page.tsx`)
        -   `not-found.tsx`: Custom 404 page
    -   The application uses `sonner` for toast notifications, and `TooltipProvider` for tooltips
    -   Custom transition components provide futuristic page transition animations (see animation spec below)
-   **Responsive Design**: The application must be fully responsive and optimized for desktop, tablet, and mobile devices
-   **Performance**:
    -   Leverage Next.js's built-in optimizations (automatic code splitting, server-side rendering)
    -   Implement Image optimization using `next/image`
    -   Use React Server Components where appropriate
    -   Ensure smooth animations and transitions, aiming for 60 FPS

## 3. Theme and Aesthetics

-   **Visual Style**: "Glassmorphism" is the core design principle. UI elements like cards, modals, and sidebars should have a frosted-glass effect with blurred backgrounds and subtle transparency
-   **Color Palette**:
    -   **Background**: `#111111` (A very dark gray or off-black)
    -   **Primary Accent**: `#8A2BE2` (A vibrant purple)
    -   **Secondary Accent/Highlights**: `#DA70D6` (A lighter, glowing purple or magenta)
    -   **Text**: `#EAEAEA` (White or a very light gray)
    -   **Accent**: Use accent colors for highlights, buttons, and interactive elements
-   **UI Elements**:
    -   **Buttons**: Should have a glass-like appearance with hover effects
    -   **Cards**: Used for displaying credential information, OTPs, and user profiles. These should be the primary showcase of the glassmorphism effect
    -   **Modals**: For forms like login, registration, and settings
    -   **Icons**: Use a modern, clean icon set (e.g., Lucide Icons, which integrate with `shadcn/ui`)

## 4. Key Features

### 4.1. User Authentication & Management
-   **Login Page (`app/login/page.tsx`)**: Allows users to sign in with email and password, includes "Remember me" functionality and a "Forgot password" link. Integrates `GlassInput` and `GlassButton` for UI
-   **Register Page (`app/register/page.tsx`)**: Enables new user registration with username, email, and password. Includes password confirmation and acceptance of Terms of Service and Privacy Policy. It also has a check for registration status (open/closed)
-   **Forgot Password Page (`app/forgot-password/page.tsx`)**: Provides a mechanism for users to reset their password via email
-   **Navigation (`components/Navigation.tsx`)**: A persistent navigation bar that adapts based on user authentication status (logged in/out) and admin privileges. It includes links to Home, Dashboard, Admin (if applicable), and Logout
-   **Account Settings Modal (`components/modals/AccountSettingsModal.tsx`)**: Allows users to manage their account settings
-   **User Management (Admin Panel) (`app/admin/page.tsx`)**: Provides administrative functionalities including user statistics (total, active, flagged activities), quick actions (system settings, security audit, database backup), and user management (suspend/activate users). It uses custom `GlassCard` and `GlassButton` components and fetches data from `/api/admin` endpoints

### 4.2. Credential & OTP Management (Dashboard)
-   **Dashboard Page (`app/dashboard/page.tsx`)**: The central hub for logged-in users. Displays owned credentials, shared access, and online users. Provides quick actions to add, share, and manage credentials and OTPs. Lists individual accounts with details like account name, type, last used, and sharing status
-   **Add Credential Modal (`components/modals/AddAccountModal.tsx`)**: Allows users to add new credentials or OTP sources
-   **Share Credential Modal (`components/modals/ShareAccountModal.tsx`)**: Facilitates sharing of credentials or OTPs with other users
-   **Manage Credential Modal (`components/modals/ManageAccountModal.tsx`)**: Enables editing or deleting existing credentials or OTPs

### 4.3. Informational Pages
-   **Index Page (`app/page.tsx`)**: Landing page with a hero section featuring the platform title and calls to action (Login/Register or Go to Dashboard/Admin). Includes a "Platform Features" section highlighting Secure Storage, Team Sharing, Access Control, and Real-time OTP
-   **Terms Page (`app/terms/page.tsx`)**: Displays the Terms of Service with sections on credential sharing, data protection, user responsibilities, service availability, prohibited conduct, termination, limitation of liability, changes to terms, and contact information
-   **Privacy Page (`app/privacy/page.tsx`)**: Outlines the Privacy Policy, detailing information collected, how it's used, data protection measures, information sharing, cookies and tracking, user rights, data retention, international data transfers, children's privacy, policy updates, and contact information
-   **Not Found Page (`app/not-found.tsx`)**: A custom 404 page for non-existent routes

## 5. Specific Visual Elements

-   **Glassmorphism Design System**: The `app/globals.css` file defines a comprehensive "Dark Glassmorphism Theme" using CSS variables for `background`, `foreground`, `glass` elements, `primary` purple accents, `secondary` elements, `muted` elements, and `accent` colors. It also includes specific styles for:
    -   `glass-card`: Transparent, blurred background cards with borders and shadows
    -   `btn-glass`: Glass-styled buttons
    -   `input-glass`: Glass-styled input fields
    -   `dot-grid`: A background effect of glowing dots
    -   `platform-title`: A text effect with gradients and glow, incorporating the platform logo
-   **Custom UI Components**:
    -   `DotGrid.tsx`: Implements an interactive background of glowing dots that react to mouse movement, contributing to the glassmorphism aesthetic
    -   Transition components in `components/transitions/`: Implement futuristic page transition animations
    -   `Navigation.tsx`: Custom navigation bar
    -   `GlassButton.tsx`: A custom button component extending `shadcn/ui`'s button, offering `default`, `primary`, `ghost`, `destructive`, `success`, and `warning` variants with glassmorphism styling
    -   `GlassCard.tsx`: A custom card component providing `GlassCardHeader`, `GlassCardTitle`, `GlassCardDescription`, `GlassCardContent`, and `GlassCardFooter` with glassmorphism styling
    -   `GlassInput.tsx`: A custom input component with glassmorphism styling
-   **`shadcn/ui` Integration**: The application heavily leverages `shadcn/ui` components as its base. The custom `glass-` prefixed components are built on top of or alongside `shadcn/ui` primitives, ensuring a cohesive design while adding the unique glassmorphism flair. Common `shadcn/ui` components include `Toaster` and `Sonner` for notifications, `TooltipProvider` for interactive tooltips, and various form and layout components
-   **Animations**:
    -   Subtle background animations to create a dynamic feel
    -   Loading spinners with a secure, modern theme
    -   Page transitions using futuristic animations
    -   Accessibility/fallbacks: respect prefers-reduced-motion (fall back to a cross-fade), allow skipping the transition, and ensure focus is handled correctly while transitioning
    -   Performance target: smooth 60 FPS with a reasonable default total duration of ~0.8–1.2s
-   **Transitions**:
    -   UI elements should have smooth transitions for hover and click states
    -   Modals and pop-ups should animate in and out
-   **UI Effects**:
    -   Implement a "holographic" or "glitch" effect on certain UI elements for a futuristic feel
    -   Use particle effects for background ambiance or to highlight special events (e.g., new credential added)

## 6. Futuristic Page Transition Animation: Triangular Shards

Create a futuristic page transition animation using triangular shards compatible with Next.js App Router navigation.

The transition should make it look like the entire screen is built from many equilateral triangular pieces. When changing pages, the old page should break apart into triangular shards that scatter outward, while the new page assembles from triangular shards flying inward. The result should feel polished, modern, and dynamic.

**Implementation with Next.js:**
- Use `framer-motion` with Next.js for animations
- Integrate with Next.js's navigation events
- Consider using React Server Components where appropriate

**Details:**

1.  **Geometry**:
    *   Use equilateral triangles to tessellate across the viewport
    *   Keep triangle size consistent but introduce slight random offsets so it doesn't look perfectly uniform

2.  **Outgoing Page Animation**:
    *   The current page breaks apart into triangular shards
    *   Each shard moves outward in a random direction with slightly varied speeds (150–400px/s)
    *   Each shard rotates slightly as it moves away
    *   Shards fade from full opacity (100%) to transparent (0%) as they leave
    *   Introduce a short randomized delay (0–150ms) so the shards don't all move at once

3.  **Incoming Page Animation**:
    *   The new page is revealed as triangular shards fly inward from outside the viewport
    *   Each shard travels inward at varied speeds
    *   Shards fade from transparent (0%) to fully visible (100%) as they settle
    *   Shards arrive in a staggered, wave-like ripple rather than all at once
    *   Motion should use smooth easing (easeOutCubic or easeInOutQuad)

4.  **Timing/Stagger**:
    *   Animations should overlap so the outgoing shards are leaving while the incoming shards are arriving
    *   Each shard's motion is offset slightly in time to create a cascading build-up effect

5.  **Style**:
    *   Shards should not look flat. Apply subtle gradients or reflective highlights to give them depth
    *   Optionally add soft glowing edges for a polished, futuristic look
    *   Shards should blend with the page's background colors, but a subtle accent (e.g. light blue or amber highlights) can be used

6.  **Duration**:
    *   The full transition should last between 0.8s and 1.2s
    *   Fast enough to feel responsive, but slow enough for the shard effect to be visible

7.  **Performance**:
    *   Must be GPU-accelerated for smoothness
    *   Implementation can use WebGL/Canvas, CSS with transforms, or animation libraries such as GSAP or Framer Motion
    *   Consider Next.js's performance optimizations and lazy loading

8.  **Overall Feel**:
    *   Dynamic and futuristic
    *   A geometric mosaic effect where the screen disassembles into triangles and reassembles into the next page
    *   Should feel clean, professional, and visually striking

## 7. Backend Integration

-   **Base URL**: The API is hosted at `http://localhost:5000/api`
-   **Authentication**:
    -   User registration and login are handled via JWT
    -   The JWT token must be stored securely on the client (e.g., in an `HttpOnly` cookie or local storage) and sent with every authenticated request in the `Authorization` header as a Bearer token
    -   Consider using Next.js middleware for authentication checks
-   **API Endpoints**:
    -   `POST /api/auth/register`: User registration
    -   `POST /api/auth/login`: User login
    -   `GET /api/dashboard`: Fetch dashboard data
    -   `GET /api/credentials`: Get all credentials
    -   `POST /api/credentials`: Add a new credential
    -   `GET /api/admin`: Fetch admin data and perform user management actions
-   **Data Formats**: All API responses will be in JSON format
-   **Error Handling**: The frontend must gracefully handle API errors (e.g., 401 Unauthorized, 404 Not Found, 500 Internal Server Error) and display user-friendly messages
-   **WebSocket Integration**:
    -   The backend will provide a WebSocket server for real-time updates (e.g., notifications, live OTP events)
    -   The frontend should establish a WebSocket connection upon user login and listen for incoming messages
-   **Next.js Specific Considerations**:
    -   Use Server Components for initial data fetching where appropriate
    -   Implement API route handlers in `app/api/` if needed for proxy or BFF pattern
    -   Consider using Next.js's built-in caching strategies

## 8. Non-Functional Requirements

-   **Accessibility**: Ensure the application is accessible (WCAG 2.1 compliance), with proper use of ARIA attributes, semantic HTML, and keyboard navigation
-   **Cross-Browser Compatibility**: The application must work seamlessly on the latest versions of modern browsers (Chrome, Firefox, Safari, Edge)
-   **Scalability**: The frontend architecture should be modular and scalable to accommodate future features
-   **SEO**: Leverage Next.js's SSR/SSG capabilities for better SEO where applicable
-   **Metadata**: Use Next.js's Metadata API for proper page titles, descriptions, and Open Graph tags

## 9. Development Configuration

-   **Next.js Configuration (`next.config.mjs`)**: Configure for optimal performance, including image domains, environment variables, and any necessary webpack customizations
-   **TypeScript Configuration (`tsconfig.json`)**: Ensure strict type checking and path aliases are properly configured
-   **Tailwind Configuration**: Set up with custom theme extensions for glassmorphism effects
-   **Package Management**: Use `pnpm` for efficient dependency management

By following this detailed prompt, you should be able to generate a complete and high-quality Next.js frontend that meets all project requirements.