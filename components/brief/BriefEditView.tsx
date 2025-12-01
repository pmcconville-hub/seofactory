
import React from 'react';
import { ContentBrief } from '../../types';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { safeString } from '../../utils/parsers';

interface BriefEditViewProps {
  brief: ContentBrief;
  onChange: (updates: Partial<ContentBrief>) => void;
}

export const BriefEditView: React.FC<BriefEditViewProps> = ({ brief, onChange }) => {
    
    const handleArrayChange = (field: keyof ContentBrief, value: string) => {
        // Split by newline, filter empty lines
        const array = value.split('\n').filter(line => line.trim() !== '');
        onChange({ [field]: array });
    };

    const handleNestedChange = (parent: keyof ContentBrief, child: string, value: any) => {
        const currentParent = brief[parent] as any || {};
        onChange({
            [parent]: {
                ...currentParent,
                [child]: value
            }
        });
    };

    return (
        <div className="space-y-6">
             {/* Search Intent */}
            <div>
                <Label>Search Intent (Featured Snippet Question)</Label>
                <Input 
                    value={safeString(brief.featured_snippet_target?.question)}
                    onChange={(e) => handleNestedChange('featured_snippet_target', 'question', e.target.value)}
                    placeholder="What is the main question this article answers?"
                />
            </div>

             {/* Perspectives */}
            <div>
                <Label>Perspectives (Target Audience/Angles)</Label>
                <p className="text-xs text-gray-400 mb-2">One per line</p>
                <Textarea 
                    value={(brief.perspectives || []).join('\n')}
                    onChange={(e) => handleArrayChange('perspectives', e.target.value)}
                    rows={3}
                    placeholder="e.g. Developer&#10;Manager"
                />
            </div>

             {/* Key Takeaways */}
            <div>
                <Label>Key Takeaways</Label>
                <p className="text-xs text-gray-400 mb-2">One per line</p>
                <Textarea 
                    value={(brief.keyTakeaways || []).join('\n')}
                    onChange={(e) => handleArrayChange('keyTakeaways', e.target.value)}
                    rows={5}
                    placeholder="e.g. Key point 1&#10;Key point 2"
                />
            </div>

             {/* Outline */}
            <div>
                <Label>Outline (Markdown)</Label>
                <Textarea 
                    value={safeString(brief.outline)}
                    onChange={(e) => onChange({ outline: e.target.value })}
                    rows={15}
                    className="font-mono text-sm"
                    placeholder="# H1 Title&#10;## H2 Section..."
                />
            </div>
        </div>
    );
};
