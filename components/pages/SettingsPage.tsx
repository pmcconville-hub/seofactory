import React, { useEffect } from 'react';
import { useAppState } from '../../state/appState';

/**
 * SettingsPage - Opens the settings modal and provides a blank background.
 * Settings remain as a modal for now; this page simply triggers it.
 */
const SettingsPage: React.FC = () => {
    const { dispatch } = useAppState();

    useEffect(() => {
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: true } });
    }, [dispatch]);

    return (
        <div className="py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
            <p className="text-gray-400">
                Manage your API keys, AI provider configuration, and global preferences.
            </p>
        </div>
    );
};

export default SettingsPage;
