# Implementation Plan: UI/UX and Functional Enhancements

This document outlines the plan for implementing significant UI/UX and functional enhancements to the Overwatch Account Share application.

## 1. Page Transitions

This section details the plan for implementing smooth page transitions with a custom animation.

### 1.1. Technology & Library Recommendations

*   **`framer-motion`**: A powerful and easy-to-use animation library for React. It's perfect for creating the complex, performant, and accessible page transitions we need.
*   **`three.js`** or **`@react-three/fiber`**: For generating and rendering the low-poly, procedurally generated triangular mesh. `@react-three/fiber` is a React renderer for `three.js` that will make it easier to integrate into our component-based architecture.

### 1.2. Component Breakdown

*   **`TransitionProvider.tsx`**: A new component that will wrap the application's routes and manage the state of the page transitions. It will listen for route changes and trigger the entry and exit animations.
*   **`TriangleAnimation.tsx`**: A component responsible for rendering and animating the triangular mesh. This component will be used by the `TransitionProvider`.

### 1.3. Step-by-Step Guide

1.  **Install Dependencies**: Add `framer-motion` and `@react-three/fiber` to the `client`'s `package.json`.
2.  **Create `TriangleAnimation.tsx`**:
    *   Use `@react-three/fiber` to create a scene with a procedurally generated triangular mesh.
    *   The mesh should be styled to have a low-poly look with a subtle, pulsing glow.
    *   The component should accept animation variants from `framer-motion` to control its appearance and disappearance (e.g., `converge`, `dissolve`).
3.  **Create `TransitionProvider.tsx`**:
    *   Wrap the `<Routes>` component in `client/src/App.tsx` with this provider.
    *   Use `framer-motion`'s `AnimatePresence` to manage the mounting and unmounting of pages.
    *   On route changes, render the `TriangleAnimation.tsx` component to orchestrate the transition:
        *   Animate the triangles to converge and cover the screen.
        *   Once the old page is hidden, the new page will be rendered underneath.
        *   Animate the triangles to dissolve, revealing the new page.
4.  **Accessibility**:
    *   Use the `useReducedMotion` hook from `framer-motion` to disable the animation if the user has `prefers-reduced-motion` enabled. In this case, a simple fade transition will be used instead.


## 2. Admin Panel Enhancements

This section covers the addition of new features to the admin panel.

### 2.1. API Endpoint Design

#### 2.1.1. Toggle User Registrations

*   **Route**: `PATCH /api/admin/settings/registration`
*   **Description**: Enable or disable user registrations.
*   **Request Body**:
    ```json
    {
      "enabled": boolean
    }
    ```
*   **Response**:
    ```json
    {
      "message": "Registration status updated successfully"
    }
    ```

#### 2.1.2. Create New User

*   **Route**: `POST /api/admin/users`
*   **Description**: Create a new user account.
*   **Request Body**:
    ```json
    {
      "username": "string",
      "email": "string",
      "password": "string",
      "role": "string" // "user" or "admin"
    }
    ```
*   **Response**:
    ```json
    {
      "message": "User created successfully",
      "user": {
        "_id": "string",
        "username": "string",
        "email": "string",
        "role": "string"
      }
    }
    ```
*   **Controller Logic**: This will require a new `createUser` function in [`server/controllers/adminController.js`](server/controllers/adminController.js:103). It should hash the password before saving the new user to the database.

### 2.2. Component Breakdown

*   **`AdminSettings.tsx`**: A new component within [`client/src/pages/Admin.tsx`](client/src/pages/Admin.tsx:1) that will contain the toggle for user registrations.
*   **`CreateUserForm.tsx`**: A new component that will be used to create new users. It will be a form with fields for username, email, password, and role. This could be placed within a modal or a dedicated section in the admin panel.

### 2.3. Step-by-Step Guide

#### Backend

1.  **Create New Routes**:
    *   Add the `PATCH /api/admin/settings/registration` and `POST /api/admin/users` routes to [`server/routes/admin.js`](server/routes/admin.js:1).
2.  **Implement Controller Logic**:
    *   In [`server/controllers/adminController.js`](server/controllers/adminController.js:103), create new functions to handle the logic for toggling registration status and creating new users.
    *   For user creation, ensure proper password hashing using `bcryptjs` (which should already be a dependency).
    *   A new model or a settings collection might be needed to store the registration status. A simple approach could be a `Settings` collection with a single document.

#### Frontend

1.  **Create `AdminSettings.tsx`**:
    *   This component will fetch the current registration status and display a switch (using the existing `Switch` component from `shadcn/ui`).
    *   When the switch is toggled, it will send a `PATCH` request to the API to update the setting.
2.  **Create `CreateUserForm.tsx`**:
    *   Build a form using `shadcn/ui` components (`Input`, `Label`, `Button`, `Select` for role).
    *   Implement form handling and validation (e.g., using `react-hook-form` and `zod`).
    *   On submission, send a `POST` request to the API to create the new user.
3.  **Integrate into `Admin.tsx`**:
    *   Add the `AdminSettings` component to the [`Admin.tsx`](client/src/pages/Admin.tsx:1) page, likely near the "Quick Actions" section.
    *   Add a button that opens a modal containing the `CreateUserForm.tsx` to create a new user. This could be placed in the "User Management" section.


## 3. UI Alignment Fixes

This section addresses the alignment and spacing issues in the modals.

### 3.1. Affected Modals

*   **Add New Account Modal**: [`client/src/components/modals/AddAccountModal.tsx`](client/src/components/modals/AddAccountModal.tsx:1)
*   **Share Account Modal**: [`client/src/components/modals/ShareAccountModal.tsx`](client/src/components/modals/ShareAccountModal.tsx:1)
*   **Account Settings Modal**: [`client/src/components/modals/AccountSettingsModal.tsx`](client/src/components/modals/AccountSettingsModal.tsx:1)

### 3.2. Issues to Fix

*   **Padding**: Ensure consistent padding between labels and input fields. Use the existing `shadcn/ui` spacing utilities (e.g., `space-y-4` for vertical spacing).
*   **Alignment**: Align labels and inputs properly. Use flexbox or grid layouts to ensure consistent alignment.
*   **Consistency**: Apply the same styling patterns used in other parts of the application to maintain visual consistency.

### 3.3. Step-by-Step Guide

1.  **Review Existing Modals**:
    *   Examine the current structure of each modal to identify specific alignment issues.
    *   Look for inconsistent use of spacing classes or layout structures.
2.  **Update Styling**:
    *   For each modal, adjust the layout to use consistent padding and alignment.
    *   Use `shadcn/ui` components like `Label` and `Input` with proper spacing classes.
    *   Ensure that form elements are properly aligned using flexbox or grid.
3.  **Test Responsiveness**:
    *   Verify that the fixes work across different screen sizes.
    *   Use the existing responsive utilities in Tailwind CSS to ensure proper alignment on mobile devices.
4.  **Consistency Check**:
    *   Compare the updated modals with other forms in the application to ensure visual consistency.
    *   Make any necessary adjustments to match the overall design language.
