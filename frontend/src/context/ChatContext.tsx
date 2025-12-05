import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Message {
    id: string;
    type: "user" | "bot";
    content: string;
    timestamp: Date;
    attachments?: string[];
}

interface LocalSession {
    id: number | string;
    title: string;
    message_count: number;
    created_at: string;
    saved?: boolean;
}

interface ChatContextType {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputValue: string;
    setInputValue: (value: string) => void;
    isTyping: boolean;
    setIsTyping: (isTyping: boolean) => void;
    typingContent: string;
    setTypingContent: (content: string) => void;
    sessions: LocalSession[];
    setSessions: React.Dispatch<React.SetStateAction<LocalSession[]>>;
    currentSessionId: number | string | null;
    setCurrentSessionId: (id: number | string | null) => void;
    resetChat: () => void;
    chatLoaded: boolean; // to track if we've attempted to load initial state
    setChatLoaded: (loaded: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};

const SESSION_STORAGE_KEY = 'edumate_chat_state';

const defaultMessages: Message[] = [
    {
        id: "1",
        type: "bot",
        content:
            "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
        timestamp: new Date(),
    },
];

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize state from sessionStorage if available
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.messages) {
                    return parsed.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to load chat state", e);
        }
        return defaultMessages;
    });

    const [inputValue, setInputValue] = useState<string>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.inputValue || "";
            }
        } catch (e) { }
        return "";
    });

    const [isTyping, setIsTyping] = useState<boolean>(false); // Don't persist typing state usually
    const [typingContent, setTypingContent] = useState<string>("");

    const [sessions, setSessions] = useState<LocalSession[]>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.sessions || [];
            }
        } catch (e) { }
        return [];
    });

    const [currentSessionId, setCurrentSessionId] = useState<number | string | null>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.currentSessionId ?? null;
            }
        } catch (e) { }
        return null;
    });

    const [chatLoaded, setChatLoaded] = useState(false);

    // Persist to sessionStorage whenever relevant state changes
    useEffect(() => {
        const stateToSave = {
            messages,
            inputValue,
            sessions,
            currentSessionId,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [messages, inputValue, sessions, currentSessionId]);

    const resetChat = () => {
        setMessages(defaultMessages);
        setInputValue("");
        setIsTyping(false);
        setTypingContent("");
        setSessions([]);
        setCurrentSessionId(null);
        setChatLoaded(false);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    };

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                inputValue,
                setInputValue,
                isTyping,
                setIsTyping,
                typingContent,
                setTypingContent,
                sessions,
                setSessions,
                currentSessionId,
                setCurrentSessionId,
                resetChat,
                chatLoaded,
                setChatLoaded,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
