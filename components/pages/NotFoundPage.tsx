import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFoundPage - 404 page for invalid routes.
 */
const NotFoundPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-6xl font-bold text-gray-600 mb-4">404</h1>
            <h2 className="text-xl text-gray-300 mb-2">Page not found</h2>
            <p className="text-gray-500 mb-6 max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/projects"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Go to Projects
            </Link>
        </div>
    );
};

export default NotFoundPage;
