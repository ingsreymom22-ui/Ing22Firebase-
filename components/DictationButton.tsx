import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

export const DictationButton: React.FC<{
    onResult: (text: string) => void;
    className?: string;
}> = ({ onResult, className = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Provide a stable callback to avoid recreating speech recognition when unneeded
    const handleResultRef = useRef(onResult);
    
    useEffect(() => {
        handleResultRef.current = onResult;
    }, [onResult]);

    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = false; // Need final results for simplicity to just append text
            
            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    handleResultRef.current(finalTranscript + ' ');
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!recognitionRef.current) {
            alert('Your browser does not support the Web Speech API. Try Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error(err);
                setIsListening(false);
            }
        }
    };

    if (typeof window === 'undefined') return null;
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        return null;
    }

    return (
        <button
            title="Dictate with Microphone"
            onClick={toggleListening}
            className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-indigo-600'} ${className}`}
        >
            {isListening ? <Mic size={16} /> : <div className="relative"><span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span><MicOff size={16} /></div>}
        </button>
    );
};
