'use client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
}

export function useAuth() {
  const mockUser: User = {
    id: 'admin-id',
    email: 'admin@flowpilot.ai',
    full_name: 'System Admin',
    role: 'admin',
    is_active: true,
  };

  return {
    user: mockUser,
    token: 'mock-jwt-token',
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    clearError: () => {},
  };
}
