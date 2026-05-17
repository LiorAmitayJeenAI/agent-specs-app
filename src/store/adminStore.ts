"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AdminStore {
  token: string;
  isAuthenticated: boolean;
  login: (password: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      token: "",
      isAuthenticated: false,

      login: (password: string) => {
        set({ token: password, isAuthenticated: true });
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
      }),
    }
  )
);
