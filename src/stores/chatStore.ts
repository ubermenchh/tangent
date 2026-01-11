import { create } from "zustand";
import { Message, createMessageId } from "@/types/message";

interface ChatState {
    messages: Message[];
    isLoading: boolean;

    addMessage: (role: Message["role"], content: string) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    clearMessages: () => void;
    setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>(set => ({
    messages: [],
    isLoading: false,

    addMessage: (role, content) => {
        const newMessage: Message = {
            id: createMessageId(),
            role,
            content,
            timestamp: Date.now(),
        };
        set(state => ({
            messages: [...state.messages, newMessage],
        }));
    },

    updateMessage: (id, updates) => {
        set(state => ({
            messages: state.messages.map(msg => (msg.id === id ? { ...msg, ...updates } : msg)),
        }));
    },

    clearMessages: () => set({ messages: [] }),

    setLoading: loading => set({ isLoading: loading }),
}));
