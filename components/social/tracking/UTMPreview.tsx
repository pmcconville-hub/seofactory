/**
 * UTMPreview Component
 *
 * Display and manage UTM-tagged links.
 */

import React, { useState } from 'react';
import type { UTMParameters, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface UTMPreviewProps {
  baseUrl: string;
  utmParameters: UTMParameters;
  platform?: SocialMediaPlatform;
  variant?: 'full' | 'compact' | 'inline';
  onCopy?: () => void;
}

export const UTMPreview: React.FC<UTMPreviewProps> = ({
  baseUrl,
  utmParameters,
  platform,
  variant = 'full',
  onCopy
}) => {
  const [copied, setCopied] = useState(false);

  // Build full URL with UTM parameters
  const buildFullUrl = (): string => {
    const url = new URL(baseUrl);

    if (utmParameters.utm_source) url.searchParams.set('utm_source', utmParameters.utm_source);
    if (utmParameters.utm_medium) url.searchParams.set('utm_medium', utmParameters.utm_medium);
    if (utmParameters.utm_campaign) url.searchParams.set('utm_campaign', utmParameters.utm_campaign);
    if (utmParameters.utm_content) url.searchParams.set('utm_content', utmParameters.utm_content);
    if (utmParameters.utm_term) url.searchParams.set('utm_term', utmParameters.utm_term);

    return url.toString();
  };

  const fullUrl = buildFullUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (variant === 'inline') {
    return (
      <span className="text-sm text-blue-400 break-all">
        {fullUrl}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400 truncate flex-1">{fullUrl}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-shrink-0 ${copied ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">UTM Link</span>
          {platform && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: `${SOCIAL_PLATFORM_CONFIG[platform].color}30`, color: SOCIAL_PLATFORM_CONFIG[platform].color }}
            >
              {SOCIAL_PLATFORM_CONFIG[platform].name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`text-sm px-3 py-1 rounded transition-colors ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Full URL */}
      <div className="p-3 border-b border-gray-700 bg-gray-900/50">
        <p className="text-sm text-blue-400 break-all font-mono">{fullUrl}</p>
      </div>

      {/* UTM Parameters breakdown */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-500 font-medium">Parameters:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'utm_source', label: 'Source', value: utmParameters.utm_source },
            { key: 'utm_medium', label: 'Medium', value: utmParameters.utm_medium },
            { key: 'utm_campaign', label: 'Campaign', value: utmParameters.utm_campaign },
            { key: 'utm_content', label: 'Content', value: utmParameters.utm_content },
            { key: 'utm_term', label: 'Term', value: utmParameters.utm_term }
          ].filter(p => p.value).map(param => (
            <div key={param.key} className="bg-gray-900/50 rounded px-2 py-1.5">
              <span className="text-[10px] text-gray-500">{param.label}</span>
              <p className="text-xs text-gray-300 truncate">{param.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Multiple UTM links for a campaign
 */
interface CampaignUTMLinksProps {
  links: Array<{
    platform: SocialMediaPlatform;
    url: string;
    utmParameters: UTMParameters;
    label?: string;
  }>;
}

export const CampaignUTMLinks: React.FC<CampaignUTMLinksProps> = ({ links }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {links.map((link, index) => {
        const config = SOCIAL_PLATFORM_CONFIG[link.platform];
        const isExpanded = expandedIndex === index;

        // Build full URL
        const url = new URL(link.url);
        Object.entries(link.utmParameters).forEach(([key, value]) => {
          if (value) url.searchParams.set(key, value);
        });
        const fullUrl = url.toString();

        return (
          <div
            key={index}
            className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: config.color }}
                >
                  <span className="text-white text-xs font-bold">
                    {config.name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-white">
                  {link.label || config.name}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="p-3 border-t border-gray-700">
                <UTMPreview
                  baseUrl={link.url}
                  utmParameters={link.utmParameters}
                  platform={link.platform}
                  variant="compact"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UTMPreview;
