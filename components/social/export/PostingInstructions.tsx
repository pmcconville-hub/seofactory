/**
 * PostingInstructions Component
 *
 * Displays platform-specific posting instructions for a social post.
 */

import React, { useState } from 'react';
import type { SocialPost, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface PostingInstructionsProps {
  post: SocialPost;
  variant?: 'full' | 'compact' | 'modal';
}

const PLATFORM_INSTRUCTIONS: Record<SocialMediaPlatform, {
  steps: string[];
  bestPractices: string[];
  optimalTime: string;
  tips: string[];
}> = {
  linkedin: {
    steps: [
      'Go to linkedin.com and click "Start a post"',
      'Paste your post content',
      'Click the image icon and upload your image',
      'Review hashtags are at the end of the post',
      'Click "Post"'
    ],
    bestPractices: [
      'Keep posts under 300 characters for 12% higher engagement',
      'Engage with comments within the first hour',
      'Use 3-5 relevant hashtags at the end'
    ],
    optimalTime: 'Tuesday-Thursday, 10am-12pm',
    tips: [
      'First 2 lines are critical - they show before "see more"',
      'Tag relevant companies and people to increase reach',
      'Native video gets 5x more engagement than links'
    ]
  },
  twitter: {
    steps: [
      'Go to x.com and click the compose button',
      'Paste your tweet content',
      'For threads: click "+" to add more tweets',
      'Add media if desired',
      'Click "Post" or "Post all" for threads'
    ],
    bestPractices: [
      'Threads get 3x more engagement than single tweets',
      'Use 1-2 hashtags maximum',
      'Hook attention in first 5 words'
    ],
    optimalTime: 'Weekdays 8am-12pm',
    tips: [
      'First tweet should hook and promise value',
      'End threads with a call-to-action',
      'Quote tweet your own thread to boost reach'
    ]
  },
  facebook: {
    steps: [
      'Go to facebook.com',
      'Click "What\'s on your mind?"',
      'Paste your post content',
      'Add photos/videos if desired',
      'Click "Post"'
    ],
    bestPractices: [
      'Keep posts under 80 characters for best engagement',
      'Ask questions to encourage comments',
      'Use 2-3 relevant hashtags'
    ],
    optimalTime: 'Wednesday 1pm-4pm',
    tips: [
      'Native video outperforms YouTube links',
      'Respond to all comments to boost algorithm',
      'Facebook Groups often have higher reach than Pages'
    ]
  },
  instagram: {
    steps: [
      'Open Instagram app',
      'Tap "+" at bottom center',
      'Select your image/carousel',
      'Add filters and edit if desired',
      'Paste caption and tap "Share"'
    ],
    bestPractices: [
      'First line is most important (shows before "more")',
      'Use 3-5 highly relevant hashtags',
      'Add hashtags at the end or in first comment'
    ],
    optimalTime: 'Monday-Friday 9am-1pm',
    tips: [
      'Carousels get 3x more engagement than single images',
      'Use line breaks for readability',
      'End with a question to encourage comments'
    ]
  },
  pinterest: {
    steps: [
      'Go to pinterest.com and click "Create Pin"',
      'Upload your image (2:3 ratio recommended)',
      'Add your title (SEO-focused)',
      'Add description with keywords',
      'Add destination link and click "Publish"'
    ],
    bestPractices: [
      'Use vertical 2:3 images for best display',
      'Include keywords naturally in description',
      'Link to a relevant, high-quality landing page'
    ],
    optimalTime: 'Saturday evenings, Sunday mornings',
    tips: [
      'Pinterest is a search engine - optimize for keywords',
      'Text overlay on images increases saves',
      'Seasonal content should be pinned 45 days early'
    ]
  }
};

export const PostingInstructions: React.FC<PostingInstructionsProps> = ({
  post,
  variant = 'full'
}) => {
  const [activeSection, setActiveSection] = useState<'steps' | 'practices' | 'tips'>('steps');

  const config = SOCIAL_PLATFORM_CONFIG[post.platform];
  const instructions = PLATFORM_INSTRUCTIONS[post.platform];
  const customInstructions = post.posting_instructions;

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <span className="text-white text-xs font-bold">{config.name.charAt(0)}</span>
          </div>
          <span className="text-sm font-medium text-white">{config.name} Instructions</span>
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          {instructions.steps.slice(0, 3).map((step, i) => (
            <p key={i} className="flex items-start gap-2">
              <span className="text-blue-400">{i + 1}.</span>
              {step}
            </p>
          ))}
          {instructions.steps.length > 3 && (
            <p className="text-gray-500">+{instructions.steps.length - 3} more steps...</p>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Best time: <span className="text-white">{instructions.optimalTime}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 border-b border-gray-700"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: config.color }}
        >
          <span className="text-white font-bold">{config.name.charAt(0)}</span>
        </div>
        <div>
          <h3 className="font-medium text-white">{config.name} Posting Guide</h3>
          <p className="text-xs text-gray-400">
            Optimal time: {post.optimal_posting_time || instructions.optimalTime}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-700">
        {[
          { key: 'steps', label: 'Steps' },
          { key: 'practices', label: 'Best Practices' },
          { key: 'tips', label: 'Tips' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key as typeof activeSection)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === tab.key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeSection === 'steps' && (
          <ol className="space-y-3">
            {instructions.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-300 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {activeSection === 'practices' && (
          <ul className="space-y-2">
            {instructions.bestPractices.map((practice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{practice}</span>
              </li>
            ))}
          </ul>
        )}

        {activeSection === 'tips' && (
          <ul className="space-y-2">
            {instructions.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-yellow-400">💡</span>
                <span className="text-gray-300">{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Custom instructions */}
        {customInstructions && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 font-medium mb-2">Additional Instructions:</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{customInstructions}</p>
          </div>
        )}
      </div>

      {/* Image requirements */}
      {post.image_instructions && (
        <div className="px-4 pb-4">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-2">Image Requirements:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Size:</span>{' '}
                <span className="text-white">
                  {post.image_instructions.dimensions.width}×{post.image_instructions.dimensions.height}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Ratio:</span>{' '}
                <span className="text-white">{post.image_instructions.dimensions.aspect_ratio}</span>
              </div>
            </div>
            {post.image_instructions.description && (
              <p className="text-xs text-gray-400 mt-2">{post.image_instructions.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostingInstructions;
