
import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../state/appState';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Loader } from '../ui/Loader';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
import { askStrategist } from '../../services/ai/strategistService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const ContextChatPanel: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { isStrategistOpen, activeMapId, topicalMaps, appStep, viewMode, activeBriefTopic } = state;
    
    const [messages, setMessages] = useState<Message[]>([{
        role: 'assistant',
        content: "Hello! I am your SEO Strategist. I see exactly what you're working on. How can I help you refine your strategy today?"
    }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeMap = topicalMaps.find(m => m.id === activeMapId);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isStrategistOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const response = await askStrategist({
                appStep,
                viewMode,
                activeMap,
                activeTopic: activeBriefTopic || undefined,
                userQuery: userMsg
            }, state.businessInfo, dispatch);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error analyzing your request. Please check your API settings." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const suggestions = [
        "What should I do next?",
        "Review my Pillars",
        "Suggest a new Topic",
        "Explain this screen"
    ];

    if (!isStrategistOpen) return null;

    return (
        <div className="fixed top-0 right-0 h-screen w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-[100] flex flex-col transform transition-transform duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <h3 className="font-bold text-white">The Strategist</h3>
                </div>
                <button onClick={() => dispatch({ type: 'TOGGLE_STRATEGIST', payload: false })} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            {/* Context Indicator */}
            <div className="px-4 py-2 bg-blue-900/20 border-b border-blue-900/50 text-xs text-blue-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {activeMap ? `Active Context: ${activeMap.name}` : 'No Active Map'}
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-900" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
                            {msg.role === 'assistant' ? <SimpleMarkdown content={msg.content} /> : msg.content}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                            <Loader className="w-4 h-4" />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="p-2 bg-gray-900 border-t border-gray-800 flex gap-2 overflow-x-auto no-scrollbar">
                {suggestions.map(s => (
                    <button 
                        key={s}
                        onClick={() => { setInput(s); handleSend(); }} 
                        className="whitespace-nowrap px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full text-xs text-gray-300 transition-colors"
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex gap-2">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for strategic advice..."
                        className="flex-grow"
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="px-3">
                        ➤
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ContextChatPanel;
