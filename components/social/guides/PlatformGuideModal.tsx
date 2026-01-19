/**
 * PlatformGuideModal Component
 *
 * Detailed platform-specific posting instructions and best practices.
 */

import React, { useState } from 'react';
import type { SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface PlatformGuideModalProps {
  platform: SocialMediaPlatform;
  isOpen: boolean;
  onClose: () => void;
}

interface PlatformGuide {
  overview: string;
  characterLimits: {
    main: number;
    preview?: number;
    thread?: number;
  };
  imageSpecs: {
    aspectRatio: string;
    dimensions: string;
    maxSize: string;
    formats: string[];
  };
  hashtagStrategy: {
    optimal: number;
    max: number;
    placement: string;
    tips: string[];
  };
  bestTimes: {
    days: string[];
    hours: string;
  };
  contentTips: string[];
  doList: string[];
  dontList: string[];
  engagementTips: string[];
  algorithmNotes: string[];
}

const PLATFORM_GUIDES: Record<SocialMediaPlatform, PlatformGuide> = {
  linkedin: {
    overview: 'LinkedIn is the premier B2B platform for professional networking and thought leadership. Focus on value-driven content that establishes expertise.',
    characterLimits: {
      main: 3000,
      preview: 210
    },
    imageSpecs: {
      aspectRatio: '1.91:1 or 1:1',
      dimensions: '1200x627 (landscape) or 1080x1080 (square)',
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'GIF']
    },
    hashtagStrategy: {
      optimal: 3,
      max: 5,
      placement: 'End of post',
      tips: [
        'Use industry-specific hashtags',
        'Mix popular and niche hashtags',
        'Create branded hashtags for campaigns',
        'Research hashtag followers before using'
      ]
    },
    bestTimes: {
      days: ['Tuesday', 'Wednesday', 'Thursday'],
      hours: '10:00 AM - 12:00 PM'
    },
    contentTips: [
      'Lead with a hook in the first 2-3 lines (before "see more")',
      'Use line breaks for readability',
      'Include a clear call-to-action',
      'Tag relevant people and companies',
      'Use native documents/carousels for higher reach'
    ],
    doList: [
      'Share original insights and experiences',
      'Engage with comments within the first hour',
      'Use polls to drive engagement',
      'Post consistently (3-5 times per week)',
      'Celebrate team and company achievements'
    ],
    dontList: [
      'Use too many hashtags (max 5)',
      'Post external links in the main post (put in comments)',
      'Share purely promotional content',
      'Ignore comments on your posts',
      'Post during weekends (lower engagement)'
    ],
    engagementTips: [
      'Reply to every comment within 1-2 hours',
      'Ask questions to encourage discussion',
      'Thank people for sharing',
      'Engage with others\' content before/after posting'
    ],
    algorithmNotes: [
      'Dwell time is a key ranking factor',
      'Native content outperforms external links',
      'First hour engagement determines reach',
      'Comments weighted higher than reactions'
    ]
  },
  twitter: {
    overview: 'X (Twitter) excels at real-time conversations, news sharing, and building community through threads and engagement.',
    characterLimits: {
      main: 280,
      thread: 280
    },
    imageSpecs: {
      aspectRatio: '16:9',
      dimensions: '1200x675 (single) or 1200x628 (card)',
      maxSize: '5MB',
      formats: ['JPG', 'PNG', 'GIF', 'WEBP']
    },
    hashtagStrategy: {
      optimal: 1,
      max: 2,
      placement: 'Within text or at end',
      tips: [
        'Less is more - 1-2 hashtags perform best',
        'Use trending hashtags when relevant',
        'Create campaign-specific hashtags',
        'Avoid hashtag stuffing'
      ]
    },
    bestTimes: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '8:00 AM - 10:00 AM, 12:00 PM - 1:00 PM'
    },
    contentTips: [
      'Front-load the most important information',
      'Use threads for complex topics (numbered 1/n)',
      'Include visuals for 2x engagement',
      'Quote tweet with added value',
      'Use polls for quick engagement'
    ],
    doList: [
      'Engage in real-time conversations',
      'Use threads for detailed explanations',
      'Retweet with commentary',
      'Respond to mentions quickly',
      'Join relevant Twitter Spaces'
    ],
    dontList: [
      'Use more than 2 hashtags',
      'Post walls of text without breaks',
      'Ignore replies and mentions',
      'Auto-post identical content repeatedly',
      'Use all caps excessively'
    ],
    engagementTips: [
      'Reply to tweets in your niche',
      'Quote retweet with insights',
      'Create tweet threads with value',
      'Use Twitter Lists to monitor topics'
    ],
    algorithmNotes: [
      'Recency matters - timeline is partially chronological',
      'Engagement in first 30 minutes is crucial',
      'Threads keep users on platform (favored)',
      'Images and videos get priority'
    ]
  },
  facebook: {
    overview: 'Facebook remains powerful for community building, local businesses, and reaching diverse demographics through groups and pages.',
    characterLimits: {
      main: 63206,
      preview: 80
    },
    imageSpecs: {
      aspectRatio: '1.91:1',
      dimensions: '1200x628 (link share) or 1080x1080 (square)',
      maxSize: '30MB',
      formats: ['JPG', 'PNG', 'GIF']
    },
    hashtagStrategy: {
      optimal: 2,
      max: 3,
      placement: 'End of post',
      tips: [
        'Use 1-3 highly relevant hashtags',
        'Research hashtag popularity on Facebook',
        'Create branded hashtags',
        'Hashtags less critical than other platforms'
      ]
    },
    bestTimes: {
      days: ['Wednesday', 'Thursday', 'Friday'],
      hours: '1:00 PM - 4:00 PM'
    },
    contentTips: [
      'Keep posts under 80 characters for best engagement',
      'Ask questions to drive comments',
      'Use native video (not YouTube links)',
      'Create shareable, emotional content',
      'Leverage Facebook Groups for community'
    ],
    doList: [
      'Post native videos (3+ minutes for monetization)',
      'Use Facebook Live for real-time engagement',
      'Create and nurture Facebook Groups',
      'Respond to all comments',
      'Use Facebook Stories for casual content'
    ],
    dontList: [
      'Post external links frequently (algorithm penalty)',
      'Use engagement bait ("Like if you agree")',
      'Ignore negative comments',
      'Post identical content to page and groups',
      'Over-post (1-2 times daily max)'
    ],
    engagementTips: [
      'Reply to comments with questions',
      'Use Facebook Reels for discoverability',
      'Go live regularly for algorithm boost',
      'Share user-generated content'
    ],
    algorithmNotes: [
      'Meaningful interactions prioritized',
      'Native video heavily favored',
      'External links get reduced reach',
      'Groups content shows more than Pages'
    ]
  },
  instagram: {
    overview: 'Instagram is a visual-first platform ideal for brand building, storytelling through imagery, and reaching younger demographics.',
    characterLimits: {
      main: 2200,
      preview: 125
    },
    imageSpecs: {
      aspectRatio: '4:5 (portrait) or 1:1 (square)',
      dimensions: '1080x1350 (portrait) or 1080x1080 (square)',
      maxSize: '30MB',
      formats: ['JPG', 'PNG']
    },
    hashtagStrategy: {
      optimal: 5,
      max: 30,
      placement: 'In caption or first comment',
      tips: [
        'Use 5-15 highly targeted hashtags',
        'Mix hashtag sizes (small, medium, large)',
        'Create branded hashtag campaigns',
        'Research hashtag relevance and size',
        'Rotate hashtags to avoid shadowban'
      ]
    },
    bestTimes: {
      days: ['Tuesday', 'Wednesday', 'Friday'],
      hours: '11:00 AM - 1:00 PM, 7:00 PM - 9:00 PM'
    },
    contentTips: [
      'First line should hook attention',
      'Use line breaks for readability',
      'Include clear call-to-action',
      'Tag locations for local discovery',
      'Use carousel posts for higher engagement'
    ],
    doList: [
      'Post high-quality, on-brand visuals',
      'Use Instagram Stories daily',
      'Create Reels for maximum reach',
      'Engage with your community actively',
      'Use Instagram Live and Collabs'
    ],
    dontList: [
      'Post low-quality or blurry images',
      'Use irrelevant hashtags',
      'Buy followers or engagement',
      'Ignore DMs and comments',
      'Post without a visual strategy'
    ],
    engagementTips: [
      'Reply to comments within 1 hour',
      'Use Stories polls and questions',
      'DM new followers with welcome message',
      'Collaborate with complementary accounts'
    ],
    algorithmNotes: [
      'Reels get significantly more reach',
      'Saves and shares weighted heavily',
      'Consistency matters for algorithm favor',
      'Engagement rate affects visibility'
    ]
  },
  pinterest: {
    overview: 'Pinterest is a visual search engine ideal for evergreen content, driving website traffic, and reaching users with purchase intent.',
    characterLimits: {
      main: 500,
      preview: 50
    },
    imageSpecs: {
      aspectRatio: '2:3',
      dimensions: '1000x1500',
      maxSize: '32MB',
      formats: ['JPG', 'PNG']
    },
    hashtagStrategy: {
      optimal: 0,
      max: 5,
      placement: 'In pin description',
      tips: [
        'Use keyword-rich descriptions instead',
        'Hashtags are searchable but less important',
        'Focus on SEO-style keywords',
        'Include brand name naturally'
      ]
    },
    bestTimes: {
      days: ['Saturday', 'Sunday'],
      hours: '8:00 PM - 11:00 PM'
    },
    contentTips: [
      'Use tall, vertical images (2:3 ratio)',
      'Add text overlay to images',
      'Write keyword-rich descriptions',
      'Create pin templates for consistency',
      'Link directly to relevant landing pages'
    ],
    doList: [
      'Create fresh pins regularly',
      'Optimize pin descriptions for search',
      'Use Rich Pins for your website',
      'Organize boards by topic/keyword',
      'Pin consistently (5-25 pins daily)'
    ],
    dontList: [
      'Use horizontal images (get cropped)',
      'Ignore pin descriptions',
      'Pin only your own content',
      'Use the same image multiple times',
      'Neglect board organization'
    ],
    engagementTips: [
      'Repin quality content from others',
      'Join group boards in your niche',
      'Enable Rich Pins for your site',
      'Create Idea Pins for engagement'
    ],
    algorithmNotes: [
      'Fresh content (new images) prioritized',
      'Pin quality and engagement matter',
      'Domain quality affects distribution',
      'Seasonal content planned 45+ days ahead'
    ]
  }
};

export const PlatformGuideModal: React.FC<PlatformGuideModalProps> = ({
  platform,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'tips' | 'algorithm'>('overview');

  if (!isOpen) return null;

  const config = SOCIAL_PLATFORM_CONFIG[platform];
  const guide = PLATFORM_GUIDES[platform];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Specifications' },
    { id: 'tips', label: 'Best Practices' },
    { id: 'algorithm', label: 'Algorithm' }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="p-4 border-b border-gray-700"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: config.color }}
              >
                <span className="text-white text-lg font-bold">
                  {config.name.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {config.name} Guide
                </h2>
                <p className="text-sm text-gray-400">
                  Complete posting guide and best practices
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overview */}
              <div>
                <p className="text-gray-300 leading-relaxed">{guide.overview}</p>
              </div>

              {/* Best Times */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Best Times to Post
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Days</p>
                    <p className="text-sm text-gray-300">{guide.bestTimes.days.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Hours</p>
                    <p className="text-sm text-gray-300">{guide.bestTimes.hours}</p>
                  </div>
                </div>
              </div>

              {/* Do / Don't */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Do
                  </h3>
                  <ul className="space-y-2">
                    {guide.doList.map((item, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    Don't
                  </h3>
                  <ul className="space-y-2">
                    {guide.dontList.map((item, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-6">
              {/* Character Limits */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Character Limits</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Main Post</p>
                    <p className="text-2xl font-bold text-white">{guide.characterLimits.main.toLocaleString()}</p>
                  </div>
                  {guide.characterLimits.preview && (
                    <div>
                      <p className="text-xs text-gray-500">Preview (before "more")</p>
                      <p className="text-2xl font-bold text-yellow-400">{guide.characterLimits.preview}</p>
                    </div>
                  )}
                  {guide.characterLimits.thread && (
                    <div>
                      <p className="text-xs text-gray-500">Per Thread Segment</p>
                      <p className="text-2xl font-bold text-blue-400">{guide.characterLimits.thread}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Specifications */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Image Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Aspect Ratio</p>
                    <p className="text-sm text-gray-300">{guide.imageSpecs.aspectRatio}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dimensions</p>
                    <p className="text-sm text-gray-300">{guide.imageSpecs.dimensions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max File Size</p>
                    <p className="text-sm text-gray-300">{guide.imageSpecs.maxSize}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Formats</p>
                    <p className="text-sm text-gray-300">{guide.imageSpecs.formats.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Hashtag Strategy */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Hashtag Strategy</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Optimal Count</p>
                    <p className="text-2xl font-bold text-green-400">{guide.hashtagStrategy.optimal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Maximum</p>
                    <p className="text-2xl font-bold text-yellow-400">{guide.hashtagStrategy.max}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Placement</p>
                    <p className="text-sm text-gray-300">{guide.hashtagStrategy.placement}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Tips</p>
                  <ul className="space-y-1">
                    {guide.hashtagStrategy.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-gray-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              {/* Content Tips */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Content Tips</h3>
                <ul className="space-y-2">
                  {guide.contentTips.map((tip, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400 font-bold">{index + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Engagement Tips */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Engagement Tips</h3>
                <ul className="space-y-2">
                  {guide.engagementTips.map((tip, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'algorithm' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Algorithm Insights</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Platform algorithms change frequently. These notes reflect general principles that tend to remain stable.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Key Algorithm Factors</h3>
                <ul className="space-y-3">
                  {guide.algorithmNotes.map((note, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-blue-400 font-bold">{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300">{note}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">General Principles</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500">•</span>
                    Early engagement signals quality to the algorithm
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500">•</span>
                    Native content typically outperforms external links
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500">•</span>
                    Consistency in posting helps maintain visibility
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500">•</span>
                    Genuine engagement beats engagement bait
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Last updated: January 2026
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Quick tips component for inline help
 */
interface BestPracticesTipsProps {
  platform: SocialMediaPlatform;
  maxTips?: number;
}

export const BestPracticesTips: React.FC<BestPracticesTipsProps> = ({
  platform,
  maxTips = 3
}) => {
  const guide = PLATFORM_GUIDES[platform];
  const tips = guide.contentTips.slice(0, maxTips);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">Quick Tips</p>
      <ul className="space-y-1.5">
        {tips.map((tip, index) => (
          <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
            <svg className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlatformGuideModal;
