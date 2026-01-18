import { create } from "zustand";
import { Message, createMessageId } from "@/types/message";
import { logger } from "@/lib/logger";

const log = logger.create("ChatStore");

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
        log.debug(`Adding ${role} message: "${content.slice(0, 50)}..." (id=${newMessage.id})`);
        set(state => {
            log.debug(`Messages count: ${state.messages.length} -> ${state.messages.length + 1}`);
            return { messages: [...state.messages, newMessage] };
        });
    },

    updateMessage: (id, updates) => {
        log.debug(`Updating message ${id}`, updates);
        set(state => ({
            messages: state.messages.map(msg => (msg.id === id ? { ...msg, ...updates } : msg)),
        }));
    },

    clearMessages: () => {
        log.info("Clearing all messages");
        set({ messages: [] });
    },

    setLoading: loading => {
        log.debug(`Loading state: ${loading}`);
        set({ isLoading: loading });
    },
}));
