import { create } from "zustand";
import { Message, createMessageId } from "@/types/message";
import { logger } from "@/lib/logger";

const log = logger.create("ChatStore");

interface ChatState {
    messages: Message[];
    activeStreams: Set<string>;

    addMessage: (role: Message["role"], content: string, options?: Partial<Message>) => string;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    appendToMessage: (id: string, text: string) => void;
    appendToReasoning: (id: string, text: string) => void;
    clearMessages: () => void;
    addStream: (msgId: string) => void;
    removeStream: (msgId: string) => void;
    isStreaming: () => boolean;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    activeStreams: new Set(),

    addMessage: (role, content, options = {}) => {
        const newMessage: Message = {
            id: createMessageId(),
            role,
            content,
            timestamp: Date.now(),
            ...options,
        };
        log.debug(`Adding ${role} message: "${content.slice(0, 50)}..." (id=${newMessage.id})`);
        set(state => {
            log.debug(`Messages count: ${state.messages.length} -> ${state.messages.length + 1}`);
            return { messages: [...state.messages, newMessage] };
        });
        return newMessage.id;
    },

    updateMessage: (id, updates) => {
        log.debug(`Updating message ${id}`, updates);
        set(state => ({
            messages: state.messages.map(msg => (msg.id === id ? { ...msg, ...updates } : msg)),
        }));
    },

    appendToMessage: (id: string, text: string) => {
        log.debug(`Appending to message ${id}`, text);
        set(state => ({
            messages: state.messages.map(msg =>
                msg.id === id ? { ...msg, content: msg.content + text } : msg
            ),
        }));
    },

    appendToReasoning: (id, text) =>
        set(state => ({
            messages: state.messages.map(m =>
                m.id === id ? { ...m, reasoning: (m.reasoning || "") + text } : m
            ),
        })),

    clearMessages: () => {
        log.info("Clearing all messages");
        set({ messages: [] });
    },

    addStream: (msgId: string) => {
        log.debug(`Adding active streams: ${msgId}`);
        set(state => {
            const next = new Set(state.activeStreams);
            next.add(msgId);
            return { activeStreams: next };
        });
    },

    removeStream: (msgId: string) => {
        log.debug(`Removing active streams: ${msgId}`);
        set(state => {
            const next = new Set(state.activeStreams);
            next.delete(msgId);
            return { activeStreams: next };
        });
    },

    isStreaming: () => get().activeStreams.size > 0,
}));
