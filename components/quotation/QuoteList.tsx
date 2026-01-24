/**
 * QuoteList - CRM-lite quote management interface
 *
 * Lists all quotes with status badges, filters, and quick actions.
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Quote,
  QuoteSummary,
  QuoteStatus,
  QuoteFilters,
} from '../../types/quotation';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteListProps {
  quotes: QuoteSummary[];
  onViewQuote: (quoteId: string) => void;
  onDuplicateQuote: (quoteId: string) => void;
  onDeleteQuote: (quoteId: string) => void;
  onStatusChange: (quoteId: string, status: QuoteStatus) => void;
  onNewQuote: () => void;
  isLoading?: boolean;
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  onViewQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onStatusChange,
  onNewQuote,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let result = [...quotes];

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter((q) => filters.status!.includes(q.status));
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.clientName.toLowerCase().includes(query) ||
          q.clientCompany?.toLowerCase().includes(query) ||
          q.clientDomain?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'total':
          comparison = (a.totalMin + a.totalMax) / 2 - (b.totalMin + b.totalMax) / 2;
          break;
        case 'status':
          const statusOrder: QuoteStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [quotes, filters, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusOptions: QuoteStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-gray-400 mt-1">Manage your SEO service proposals</p>
        </div>
        <Button onClick={onNewQuote}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Quote
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search quotes..."
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  const current = filters.status || [];
                  if (current.includes(status)) {
                    setFilters({ ...filters, status: current.filter((s) => s !== status) });
                  } else {
                    setFilters({ ...filters, status: [...current, status] });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filters.status?.includes(status)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="total-desc">Highest Value</option>
            <option value="total-asc">Lowest Value</option>
            <option value="status-asc">Status</option>
          </select>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Quotes', value: quotes.length, color: 'text-white' },
          { label: 'Pending', value: quotes.filter((q) => q.status === 'draft' || q.status === 'sent').length, color: 'text-yellow-400' },
          { label: 'Accepted', value: quotes.filter((q) => q.status === 'accepted').length, color: 'text-green-400' },
          {
            label: 'Total Value',
            value: formatCurrency(quotes.filter((q) => q.status === 'accepted').reduce((sum, q) => sum + (q.totalMin + q.totalMax) / 2, 0)),
            color: 'text-blue-400',
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Quotes List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading quotes...</p>
        </Card>
      ) : filteredQuotes.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">No quotes found</p>
          <Button onClick={onNewQuote}>Create Your First Quote</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => (
            <Card
              key={quote.id}
              className="p-4 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => onViewQuote(quote.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <QuoteStatusBadge status={quote.status} />
                  <div>
                    <div className="font-medium text-white">
                      {quote.clientCompany || quote.clientName || 'Unnamed Quote'}
                    </div>
                    {quote.clientDomain && (
                      <div className="text-sm text-gray-400">{quote.clientDomain}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-medium text-white">
                      {formatCurrency(quote.totalMin)} - {formatCurrency(quote.totalMax)}
                    </div>
                    <div className="text-sm text-gray-400">{formatDate(quote.createdAt)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDuplicateQuote(quote.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {quote.status === 'draft' && (
                      <button
                        onClick={() => onStatusChange(quote.id, 'sent')}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Mark as Sent"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteQuote(quote.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Version indicator */}
              {quote.version > 1 && (
                <div className="mt-2 text-xs text-gray-500">Version {quote.version}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuoteList;
