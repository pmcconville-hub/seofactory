
import React, { useState } from 'react';
import { SemanticTriple, AttributeCategory } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';

interface TripleEditRowProps {
    triple: SemanticTriple;
    onChange: (updatedTriple: SemanticTriple) => void;
    onDelete: () => void;
}

export const TripleEditRow: React.FC<TripleEditRowProps> = ({ triple, onChange, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (section: 'subject' | 'predicate' | 'object', field: string, value: string) => {
        onChange({
            ...triple,
            [section]: {
                ...triple[section],
                [field]: value
            }
        });
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({
            ...triple,
            predicate: {
                ...triple.predicate,
                category: e.target.value as AttributeCategory
            }
        });
    };

    const handleMetadataChange = (section: 'validation' | 'presentation', field: string, value: any) => {
        const currentMetadata = triple.metadata || {};
        const currentSection = currentMetadata[section] || {};
        
        onChange({
            ...triple,
            metadata: {
                ...currentMetadata,
                [section]: {
                    ...currentSection,
                    [field]: value
                }
            }
        });
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg mb-2 overflow-hidden">
            {/* Main Row */}
            <div className="p-3 flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                    {/* Subject */}
                    <div className="md:col-span-3">
                        <Input 
                            value={triple.subject.label}
                            onChange={(e) => handleChange('subject', 'label', e.target.value)}
                            placeholder="Entity (Subject)"
                            className="!text-sm !py-1.5"
                        />
                    </div>
                    
                    {/* Predicate */}
                    <div className="md:col-span-3">
                        <Input 
                            value={triple.predicate.relation}
                            onChange={(e) => handleChange('predicate', 'relation', e.target.value)}
                            placeholder="Attribute (Predicate)"
                            className="!text-sm !py-1.5 font-mono text-purple-300"
                        />
                    </div>

                    {/* Object */}
                    <div className="md:col-span-3">
                        <Input 
                            value={String(triple.object.value)}
                            onChange={(e) => handleChange('object', 'value', e.target.value)}
                            placeholder="Value (Object)"
                            className="!text-sm !py-1.5"
                        />
                    </div>

                     {/* Category Selector */}
                     <div className="md:col-span-3">
                         <Select 
                            value={triple.predicate.category || 'COMMON'} 
                            onChange={handleCategoryChange}
                            className="!text-xs !py-1.5"
                        >
                            <option value="CORE_DEFINITION">Core Definition (Root)</option>
                            <option value="SEARCH_DEMAND">Search Demand (Popular)</option>
                            <option value="COMPETITIVE_EXPANSION">Competitive (Unique)</option>
                            <option value="COMPOSITE">Composite (Group)</option>
                            <option value="COMMON">Common (Generic)</option>
                         </Select>
                     </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${isExpanded ? 'text-blue-400' : 'text-gray-500'}`}
                        title="Toggle Details"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button 
                        type="button"
                        onClick={onDelete}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Delete Triple"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expanded Metadata Section */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 bg-gray-900/50 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {/* Validation Metadata */}
                        <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                             <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Validation Rules</Label>
                             <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                     <span className="text-xs text-gray-400">Type</span>
                                     <Select 
                                        value={triple.metadata?.validation?.type || 'STRING'}
                                        onChange={(e) => handleMetadataChange('validation', 'type', e.target.value)}
                                        className="!text-[10px] !py-0.5 !w-24"
                                     >
                                         <option value="STRING">String</option>
                                         <option value="NUMBER">Number</option>
                                         <option value="CURRENCY">Currency</option>
                                         <option value="BOOLEAN">Boolean</option>
                                     </Select>
                                 </div>
                                 {/* Add Min/Max inputs if needed in future */}
                             </div>
                        </div>

                        {/* Presentation Metadata */}
                         <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                             <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">UI Presentation (LIFT)</Label>
                             <div className="flex items-center justify-between">
                                 <span className="text-xs text-gray-400">Prominence</span>
                                 <Select 
                                    value={triple.metadata?.presentation?.prominence || 'STANDARD'}
                                    onChange={(e) => handleMetadataChange('presentation', 'prominence', e.target.value)}
                                    className="!text-[10px] !py-0.5 !w-28"
                                 >
                                     <option value="STANDARD">Standard</option>
                                     <option value="CENTERPIECE">Centerpiece (High)</option>
                                     <option value="SUPPLEMENTARY">Supplementary</option>
                                 </Select>
                             </div>
                        </div>

                        {/* Data Enrichment */}
                        <div className="bg-black/20 p-2 rounded border border-gray-700/50">
                            <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Data Details</Label>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input 
                                        placeholder="Unit (e.g. kg)"
                                        value={triple.object.unit || ''}
                                        onChange={(e) => onChange({ ...triple, object: { ...triple.object, unit: e.target.value } })}
                                        className="!text-xs !py-0.5 !h-6"
                                    />
                                    <Input 
                                        placeholder="Truth Range"
                                        value={triple.object.truth_range || ''}
                                        onChange={(e) => onChange({ ...triple, object: { ...triple.object, truth_range: e.target.value } })}
                                        className="!text-xs !py-0.5 !h-6"
                                        title="e.g. 7.0 - 7.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
