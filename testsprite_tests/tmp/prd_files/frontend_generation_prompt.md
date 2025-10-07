# AI Frontend Generation Prompt: Overwatch-Themed Web Application

## 1. Project Overview

You are tasked with generating the complete frontend for an Overwatch-themed web application. This application allows users to participate in a simulated Overwatch environment, including hero management, match simulations, and social features like leaderboards. The frontend should be a modern, responsive, and visually stunning single-page application (SPA) that provides an immersive user experience.

## 2. Core Frontend Requirements

-   **Technology Stack**:
    -   **Framework**: React (using Vite for the build tool)
    -   **Language**: TypeScript
    -   **Styling**: Tailwind CSS for utility-first styling.
    -   **UI Components**: Utilize `shadcn/ui` for the base component library.
-   **Application Structure and Routing**:
    -   The main entry point is `src/App.tsx`, defining core routing using `react-router-dom`.
    -   Key routes include:
        -   `/`: Index/Landing page
        -   `/login`: User login
        -   `/register`: New user registration
        -   `/forgot-password`: Password recovery
        -   `/dashboard`: User dashboard for account management
        -   `/admin`: Administrator panel (restricted access)
        -   `/terms`: Terms of Service page
        -   `/privacy`: Privacy Policy page
        -   `*`: Catch-all for Not Found pages
    -   The application uses `react-query` for data fetching and state management, `sonner` for toast notifications, and `TooltipProvider` for tooltips.
    -   A custom `GeometricTransition` component provides a visual transition effect between routes. Triangles build left-to-right, meeting in the center like venom, with each triangle forming the visible portion of the incoming page.
-   **Responsive Design**: The application must be fully responsive and optimized for desktop, tablet, and mobile devices.
-   **Performance**:
    -   Implement lazy loading for components and routes to reduce initial load time.
    -   Optimize assets (images, fonts) for fast delivery.
    -   Ensure smooth animations and transitions, aiming for 60 FPS.

## 3. Theme and Aesthetics

-   **Visual Style**: "Glassmorphism" is the core design principle. UI elements like cards, modals, and sidebars should have a frosted-glass effect with blurred backgrounds and subtle transparency.
-   **Color Palette**:
    -   **Background**: `#111111` (A very dark gray or off-black)
    -   **Primary Accent**: `#8A2BE2` (A vibrant purple)
    -   **Secondary Accent/Highlights**: `#DA70D6` (A lighter, glowing purple or magenta)
    -   **Text**: `#EAEAEA` (White or a very light gray)
    -   **Accent**: Use accent colors for highlights, buttons, and interactive elements.
-   **UI Elements**:
    -   **Buttons**: Should have a glass-like appearance with hover effects.
    -   **Cards**: Used for displaying hero information, match results, and user profiles. These should be the primary showcase of the glassmorphism effect.
    -   **Modals**: For forms like login, registration, and settings.
    -   **Icons**: Use a modern, clean icon set (e.g., Lucide Icons, which integrate with `shadcn/ui`).

## 4. Key Features

### 4.1. User Authentication & Management
-   **Login Page (`client/src/pages/Login.tsx`)**: Allows users to sign in with email and password, includes "Remember me" functionality and a "Forgot password" link. Integrates `GlassInput` and `GlassButton` for UI.
-   **Register Page (`client/src/pages/Register.tsx`)**: Enables new user registration with username, email, and password. Includes password confirmation and acceptance of Terms of Service and Privacy Policy. It also has a check for registration status (open/closed).
-   **Forgot Password Page (`client/src/pages/ForgotPassword.tsx`)**: Provides a mechanism for users to reset their password via email.
-   **Navigation (`client/src/components/Navigation.tsx`)**: A persistent navigation bar that adapts based on user authentication status (logged in/out) and admin privileges. It includes links to Home, Dashboard, Admin (if applicable), and Logout.
-   **Account Settings Modal (`client/src/components/modals/AccountSettingsModal.tsx`)**: Allows users to manage their account settings.
-   **User Management (Admin Panel) (`client/src/pages/Admin.tsx`)**: Provides administrative functionalities including user statistics (total, active, flagged activities), quick actions (system settings, security audit, database backup), and user management (suspend/activate users). It uses custom `GlassCard` and `GlassButton` components and fetches data from `/api/admin` endpoints.

### 4.2. Account Management (Dashboard)
-   **Dashboard Page (`client/src/pages/Dashboard.tsx`)**: The central hub for logged-in users. Displays owned accounts, shared access, and online users. Provides quick actions to add, share, and manage accounts. Lists individual Overwatch accounts with details like gamertag, rank, main heroes, last used, and sharing status.
-   **Add Account Modal (`client/src/components/modals/AddAccountModal.tsx`)**: Allows users to add new Overwatch accounts.
-   **Share Account Modal (`client/src/components/modals/ShareAccountModal.tsx`)**: Facilitates sharing of accounts with other users.
-   **Manage Account Modal (`client/src/components/modals/ManageAccountModal.tsx`)**: Enables editing or deleting existing accounts.

### 4.3. Match Simulation (Future Feature)
-   **Team Selection**: Allow users to form a team by selecting heroes.
-   **Match Simulation UI**: A visually engaging interface that shows the "match" in progress. This can be a series of animated events or a simplified real-time log.
-   **Results Screen**: After the simulation, display a detailed results screen with statistics, "Play of the Game" highlight, and experience points earned.

### 4.4. Profile Management (Future Feature)
-   **User Profile Page**: A dedicated page for users to view their stats, match history, and achievements.
-   **Profile Customization**: Allow users to change their avatar and other profile details.

### 4.5. Leaderboards (Future Feature)
-   **Ranking System**: A global leaderboard that ranks users based on their performance (e.g., win rate, total experience).
-   **Filters**: Allow filtering the leaderboard by different metrics.

### 4.6. Informational Pages
-   **Index Page (`client/src/pages/Index.tsx`)**: Landing page with a hero section featuring the `OverwatchTitle` and calls to action (Login/Register or Go to Dashboard/Admin). Includes a "Platform Features" section highlighting Secure Storage, Team Sharing, Access Control, and Real-time OTP.
-   **Terms Page (`client/src/pages/Terms.tsx`)**: Displays the Terms of Service with sections on account sharing, data protection, user responsibilities, service availability, prohibited conduct, termination, limitation of liability, changes to terms, and contact information.
-   **Privacy Page (`client/src/pages/Privacy.tsx`)**: Outlines the Privacy Policy, detailing information collected, how it's used, data protection measures, information sharing, cookies and tracking, user rights, data retention, international data transfers, children's privacy, policy updates, and contact information.
-   **Not Found Page (`client/src/pages/NotFound.tsx`)**: A generic 404 page for non-existent routes.

## 5. Specific Visual Elements

-   **Glassmorphism Design System**: The `client/src/index.css` file defines a comprehensive "Dark Glassmorphism Theme" using CSS variables for `background`, `foreground`, `glass` elements, `primary` purple accents, `secondary` elements, `muted` elements, and `accent` colors. It also includes specific styles for:
    -   `glass-card`: Transparent, blurred background cards with borders and shadows.
    -   `btn-glass`: Glass-styled buttons.
    -   `input-glass`: Glass-styled input fields.
    -   `dot-grid`: A background effect of glowing dots.
    -   `overwatch-title`: A text effect with gradients and glow, incorporating an Overwatch logo.
-   **Custom UI Components**:
    -   `DotGrid.tsx`: Implements an interactive background of glowing dots that react to mouse movement, contributing to the glassmorphism aesthetic.
    -   `GeometricTransition.tsx`: Implements a triangular page transition where layered triangular masks or absolutely positioned triangular elements (CSS clip-path polygons) animate left→right in a staggered sequence and meet at the center, each triangle revealing the corresponding segment of the incoming route. Styled via `GeometricTransition.css`.
        -   Implementation guidance (short, non-code):
            -   Use layered triangular masks or absolutely positioned triangular elements (CSS clip-path polygons) that animate left→right in a staggered sequence and meet at center.
            -   Each triangle should act as a reveal for the corresponding portion of the incoming page (as the triangle reaches its final position it displays that segment of the new route).
            -   Stagger timing (small delay per triangle) to create a "building" effect; expose CSS variables (e.g., --transition-duration, --transition-stagger) so designers/engineers can tune duration and stagger.
            -   Use hardware-accelerated transforms (translateX / scale / opacity) and minimize layout-triggering properties to maintain smooth animation.
            -   Provide accessibility and fallbacks: respect prefers-reduced-motion (fall back to a performant cross-fade), allow the transition to be skipped programmatically, and ensure keyboard focus is preserved and restored.
            -   Performance target: smooth 60 FPS; reasonable default total duration: 550–900ms.
    -   `Navigation.tsx`: Custom navigation bar.
    -   `OverwatchTitle.tsx`: Displays the stylized "OVERWATCH" title with a custom image and interactive glow effect, aligning with the "Overwatch logo prominently displayed in the header, with a subtle light-up effect" and "Text elements throughout the UI with a light-up effect" requirements.
    -   `GlassButton.tsx`: A custom button component extending `shadcn/ui`'s button, offering `default`, `primary`, `ghost`, `destructive`, `success`, and `warning` variants with glassmorphism styling.
    -   `GlassCard.tsx`: A custom card component providing `GlassCardHeader`, `GlassCardTitle`, `GlassCardDescription`, `GlassCardContent`, and `GlassCardFooter` with glassmorphism styling.
    -   `GlassInput.tsx`: A custom input component with glassmorphism styling.
-   **`shadcn/ui` Integration**: The application heavily leverages `shadcn/ui` components as its base. The custom `glass-` prefixed components are built on top of or alongside `shadcn/ui` primitives, ensuring a cohesive design while adding the unique glassmorphism flair. Common `shadcn/ui` components observed include `Toaster` and `Sonner` for notifications, `TooltipProvider` for interactive tooltips, and various form and layout components.
-   **Animations**:
    -   Subtle background animations to create a dynamic feel.
    -   Loading spinners with an Overwatch theme.
    -   Page transitions should be smooth and thematic: triangles build left-to-right, meeting in the center like venom, with each triangle forming the visible portion of the incoming page. Implement this as staggered triangular reveals — either layered triangular masks or absolutely positioned triangular elements using CSS clip-path polygons — animating left→right to meet at center. Use CSS variables for --transition-duration and --transition-stagger to tune timing, apply small per-triangle delays to create a "building" effect, and favor hardware-accelerated transforms (translateX / scale / opacity) to minimize layout work.
    -   Accessibility/fallbacks: respect prefers-reduced-motion (fall back to a cross-fade), allow skipping the transition, and ensure focus is handled correctly while transitioning.
    -   Performance target: smooth 60 FPS with a reasonable default total duration of ~550–900ms.
-   **Transitions**:
    -   UI elements should have smooth transitions for hover and click states.
    -   Modals and pop-ups should animate in and out.
-   **UI Effects**:
    -   Implement a "holographic" or "glitch" effect on certain UI elements for a futuristic feel.
    -   Use particle effects for background ambiance or to highlight special events (e.g., leveling up).

## 6. Backend Integration

-   **Base URL**: The API is hosted at `http://localhost:5000/api`.
-   **Authentication**:
    -   User registration and login are handled via JWT.
    -   The JWT token must be stored securely on the client (e.g., in an `HttpOnly` cookie or local storage) and sent with every authenticated request in the `Authorization` header as a Bearer token.
-   **API Endpoints**:
    -   `POST /api/auth/register`: User registration.
    -   `POST /api/auth/login`: User login.
    -   `GET /api/dashboard`: Fetch dashboard data.
    -   `GET /api/overwatch-accounts`: Get all accounts.
    -   `POST /api/overwatch-accounts`: Add a new account.
    -   `GET /api/admin`: Fetch admin data and perform user management actions.
-   **Data Formats**: All API responses will be in JSON format.
-   **Error Handling**: The frontend must gracefully handle API errors (e.g., 401 Unauthorized, 404 Not Found, 500 Internal Server Error) and display user-friendly messages.
-   **WebSocket Integration**:
    -   The backend will provide a WebSocket server for real-time updates (e.g., notifications, live match events).
    -   The frontend should establish a WebSocket connection upon user login and listen for incoming messages.

## 7. Non-Functional Requirements

-   **Accessibility**: Ensure the application is accessible (WCAG 2.1 compliance), with proper use of ARIA attributes, semantic HTML, and keyboard navigation.
-   **Cross-Browser Compatibility**: The application must work seamlessly on the latest versions of modern browsers (Chrome, Firefox, Safari, Edge).
-   **Scalability**: The frontend architecture should be modular and scalable to accommodate future features.

By following this detailed prompt, you should be able to generate a complete and high-quality frontend that meets all project requirements.