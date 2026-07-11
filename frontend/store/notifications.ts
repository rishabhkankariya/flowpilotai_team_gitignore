import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: 'success' | 'info' | 'warning' | 'error';
  created_at: string;
}

interface NotificationsState {
  notifications: NotificationItem[];
}

interface NotificationsActions {
  addNotification: (title: string, message: string, type?: NotificationItem['type']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>()(
  persist(
    (set) => ({
      notifications: [
        {
          id: 'welcome',
          title: 'Welcome to FlowPilot AI',
          message: 'Get started by submitting queries or uploading documents in the AI Inbox!',
          read: false,
          type: 'info',
          created_at: new Date().toISOString(),
        }
      ],

      addNotification: (title, message, type = 'info') =>
        set((state) => ({
          notifications: [
            {
              id: Math.random().toString(36).substring(7),
              title,
              message,
              read: false,
              type,
              created_at: new Date().toISOString(),
            },
            ...state.notifications,
          ].slice(0, 50),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'flowpilot-notifications',
    }
  )
);
