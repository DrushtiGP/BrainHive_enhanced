import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * RoleGuard — conditionally renders children based on role or group ownership.
 *
 * Props:
 *   requiredRole?: 'admin'  — renders children only if user.role === requiredRole
 *   creatorId?: number      — renders children only if user.id === creatorId
 *   fallback?: ReactNode    — what to render when access is denied (default: null)
 *   redirect?: boolean      — if true, redirect to /unauthorized instead of rendering fallback
 */
const RoleGuard = ({ requiredRole, creatorId, fallback = null, redirect = false, children }) => {
  const user = useSelector((state) => state.auth.user);

  if (!user) return redirect ? <Navigate to="/" replace /> : fallback;

  if (requiredRole && user.role !== requiredRole) {
    return redirect ? <Navigate to="/unauthorized" replace /> : fallback;
  }

  if (creatorId !== undefined && user.id !== creatorId) {
    return fallback;
  }

  return children;
};

export default RoleGuard;
