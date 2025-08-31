# Overwatch Account Sharing API Specification

This document outlines the backend API endpoints and data structures required to support the Dashboard and Admin Panel pages of the Overwatch Account Sharing application.

## 1. Authentication

Authentication is handled via JWT (JSON Web Tokens). A valid Bearer Token must be included in the `Authorization` header for all protected endpoints.

### Endpoints

-   `POST /api/auth/login`
-   `POST /api/auth/register`
-   `GET /api/auth/me`

## 2. Dashboard API

### GET `/api/dashboard`

Retrieves all necessary data for the main dashboard view in a single call.

-   **Authentication:** Required
-   **Response (200 OK):**
    ```json
    {
      "user": {
        "username": "string",
        "accountsOwned": "number",
        "accountsShared": "number"
      },
      "accounts": [
        {
          "_id": "string",
          "gamertag": "string",
          "rank": "string",
          "heroes": ["string"],
          "lastUsed": "date-time",
          "sharedWith": ["string"],
          "status": "string"
        }
      ],
      "recentActivity": [
        {
          "type": "string",
          "description": "string",
          "timestamp": "date-time"
        }
      ],
      "onlineUsers": "number"
    }
    ```

## 3. Overwatch Accounts API (`/api/overwatch-accounts`)

Handles all CRUD operations for Overwatch accounts.

### GET `/`

Retrieves a list of all Overwatch accounts visible to the user.

### POST `/`

Adds a new Overwatch account.
-   **Request Body:**
    ```json
    {
      "gamertag": "string",
      "rank": "string",
      "mainHeroes": ["string"]
    }
    ```

### PUT `/:id`

Updates an existing Overwatch account.
-   **Request Body:**
    ```json
    {
      "rank": "string",
      "mainHeroes": ["string"]
    }
    ```

### DELETE `/:id`

Deletes an Overwatch account.

### POST `/:id/share`

Shares an account with another user.
-   **Request Body:**
    ```json
    {
      "shareWithUserId": "string"
    }
    ```

## 4. Admin API (`/api/admin`)

Endpoints restricted to users with administrator privileges.

### GET `/stats`

Retrieves high-level statistics for the admin dashboard.
-   **Response (200 OK):**
    ```json
    {
      "totalUsers": "number",
      "activeUsers": "number",
      "totalAccounts": "number",
      "flaggedActivities": "number"
    }
    ```

### GET `/users`

Fetches a list of all users in the system. Supports pagination and filtering.

### PATCH `/users/:id/status`

Updates a user's status (e.g., `suspend`, `activate`).
-   **Request Body:**
    ```json
    {
      "status": "string"
    }
    ```

### GET `/logs`

Retrieves recent system-wide activity logs.