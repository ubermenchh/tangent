import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "./mmkvStores";
import { Task, createTaskId } from "@/types/task";
import { logger } from "@/lib/logger";

const log = logger.create("TaskStore");

interface TaskState {
    tasks: Task[];
    activeTaskId: string | null;
}

interface TaskActions {
    addTask: (prompt: string) => string;
    updateTask: (id: string, updates: Partial<Task>) => void;
    setActiveTask: (id: string | null) => void;
    completeTask: (id: string, result: string) => void;
    failTask: (id: string, error: string) => void;
    cancelTask: (id: string) => void;
    confirmAction: (taskId: string, approved: boolean) => void;
    clearCompletedTasks: () => void;
    getTask: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskState & TaskActions>()(
    persist(
        (set, get) => ({
            tasks: [],
            activeTaskId: null,

            addTask: prompt => {
                const id = createTaskId();
                const task: Task = {
                    id,
                    prompt,
                    status: "queued",
                    progress: 0,
                    steps: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                log.info(`Adding task: ${id}`);
                set(state => ({ tasks: [...state.tasks, task] }));
                return id;
            },

            updateTask: (id, updates) => {
                log.debug(`Updating task ${id}`, updates);
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
                    ),
                }));
            },

            setActiveTask: id => set({ activeTaskId: id }),

            completeTask: (id, result) => {
                log.info(`Task completed: ${id}`);
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === id
                            ? {
                                  ...t,
                                  status: "completed",
                                  result,
                                  progress: 100,
                                  completedAt: Date.now(),
                                  updatedAt: Date.now(),
                              }
                            : t
                    ),
                    activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
                }));
            },

            failTask: (id, error) => {
                log.error(`Task failed: ${id}`, error);
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, status: "failed", error, updatedAt: Date.now() } : t
                    ),
                    activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
                }));
            },

            cancelTask: id => {
                log.info(`Task cancelled: ${id}`);
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, status: "cancelled", updatedAt: Date.now() } : t
                    ),
                    activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
                }));
            },

            confirmAction: (taskId, approved) => {
                log.info(`Task ${taskId} confirmation: ${approved}`);
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? {
                                  ...t,
                                  status: approved ? "running" : "cancelled",
                                  pendingConfirmation: undefined,
                                  updatedAt: Date.now(),
                              }
                            : t
                    ),
                }));
            },

            clearCompletedTasks: () => {
                log.info("Clearing completed tasks");
                set(state => ({
                    tasks: state.tasks.filter(
                        t => !["completed", "failed", "cancelled"].includes(t.status)
                    ),
                }));
            },

            getTask: id => get().tasks.find(t => t.id === id),
        }),
        {
            name: "tangent-tasks",
            storage: createJSONStorage(() => mmkvStorage),
            partialize: state => ({ tasks: state.tasks }),
        }
    )
);
