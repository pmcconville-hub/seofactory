import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppState } from '../../state/appState';

/**
 * AuthGuard - Protects routes that require authentication.
 * Redirects to /login if no user session exists.
 * Saves the attempted URL so we can redirect back after login.
 */
const AuthGuard: React.FC = () => {
    const { state } = useAppState();
    const location = useLocation();

    if (!state.user) {
        // Save the URL the user was trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default AuthGuard;
