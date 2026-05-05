import { create } from "zustand";
import type { User } from "../types/user";

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const storedToken = localStorage.getItem("chatly_token");
const storedUser = localStorage.getItem("chatly_user");

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  setAuth: (user, token) => {
    localStorage.setItem("chatly_token", token);
    localStorage.setItem("chatly_user", JSON.stringify(user));
    set({ user, token });
  },
  updateUser: (user) => {
    localStorage.setItem("chatly_user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("chatly_token");
    localStorage.removeItem("chatly_user");
    set({ user: null, token: null });
  }
}));
