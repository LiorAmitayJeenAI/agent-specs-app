"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AdminStore {
  token: string;
  isAuthenticated: boolean;
  adminName: string;
  adminRole: string;
  login: (password: string, name?: string, role?: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      token: "",
      isAuthenticated: false,
      adminName: "ליאור אמיתי",
      adminRole: "מנהל מערכת",

      login: (password: string, name?: string, role?: string) => {
        set({
          token: password,
          isAuthenticated: true,
          ...(name && { adminName: name }),
          ...(role && { adminRole: role }),
        });
      },

      logout: () => {
        set({ token: "", isAuthenticated: false });
      },
    }),
    {
      name: "admin-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        adminName: state.adminName,
        adminRole: state.adminRole,
      }),
    }
  )
);
