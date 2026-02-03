import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import { useAppState } from '../../state/appState';
import ContextChatPanel from '../strategist/ContextChatPanel';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

/**
 * AppShell - The main layout shell with sidebar + breadcrumb + main content area.
 * Replaces the old MainLayout.tsx for routes that need the sidebar navigation.
 * The strategist panel and EdgeToolbar are rendered here alongside the main content.
 */
const AppShell: React.FC = () => {
    const { state } = useAppState();
    const location = useLocation();

    // Sidebar collapsed state from localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const handleToggleCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
            } catch {
                // localStorage unavailable
            }
            return next;
        });
    };

    // Check if we're on the login page (no sidebar)
    const isLoginPage = location.pathname === '/login';
    if (isLoginPage) {
        return <Outlet />;
    }

    const showStrategistUI = !!state.user;
    const sidebarWidth = sidebarCollapsed ? 56 : 240;

    return (
        <div className="relative min-h-screen flex">
            {/* Sidebar */}
            {state.user && (
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />
            )}

            {/* Main Content Area */}
            <main
                className={`flex-1 min-h-screen transition-all duration-300 ${
                    state.isStrategistOpen ? 'mr-96' : ''
                }`}
                style={{ marginLeft: state.user ? sidebarWidth : 0 }}
            >
                {/* Breadcrumb bar */}
                {state.user && (
                    <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4">
                        <Breadcrumb />
                    </div>
                )}

                {/* Page content */}
                <div className="p-4">
                    <Outlet />
                </div>
            </main>

            {/* Strategist Panel - stays as right-side slide-out */}
            {showStrategistUI && <ContextChatPanel />}
        </div>
    );
};

export default AppShell;
