import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuotationTool } from '../quotation';

/**
 * QuotationPage - Route wrapper for the SEO quotation tool.
 */
const QuotationPage: React.FC = () => {
    const navigate = useNavigate();

    return <QuotationTool onClose={() => navigate('/projects')} />;
};

export default QuotationPage;
