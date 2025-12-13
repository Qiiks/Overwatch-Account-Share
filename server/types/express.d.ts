/**
 * Express Request Extension Types
 * Extends Express Request to include authenticated user information
 */

import { Request } from 'express';

/**
 * User object from database/JWT
 */
export interface AuthUser {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'User' | 'Admin';
  isAdmin: boolean;
  isadmin?: boolean;
  isApproved: boolean;
  isapproved?: boolean;
  createdAt?: string;
  createdat?: string;
  updatedAt?: string;
  updatedat?: string;
  password_hash?: string;
  googleId?: string;
  googleid?: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  id: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
