import React from 'react';
import { useAppState } from '../../state/appState';
import { AppStep } from '../../types';
import ContextChatPanel from '../strategist/ContextChatPanel';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { state } = useAppState();
    const { isStrategistOpen, appStep } = state;

    // Only show strategist UI when user is logged in and not on auth screen
    const showStrategistUI = state.user && appStep !== AppStep.AUTH;

    return (
        <div className="relative min-h-screen flex flex-col">
            {/* Main Content Area */}
            <main className={`flex-grow transition-all duration-300 ${isStrategistOpen ? 'mr-96' : ''}`}>
                {children}
            </main>

            {/* Strategist Sidebar - only show when logged in and not on auth screen */}
            {showStrategistUI && <ContextChatPanel />}

            {/* Note: The Ask Strategist button is now in EdgeToolbar (App.tsx) for unified hover-expand behavior */}
        </div>
    );
};

export default MainLayout;