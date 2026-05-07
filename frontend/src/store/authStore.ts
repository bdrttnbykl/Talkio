import { create } from "zustand";
import type { User } from "../types/user";

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const storedToken = localStorage.getItem("talkio_token");
const storedUser = localStorage.getItem("talkio_user");

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  setAuth: (user, token) => {
    localStorage.setItem("talkio_token", token);
    localStorage.setItem("talkio_user", JSON.stringify(user));
    set({ user, token });
  },
  updateUser: (user) => {
    localStorage.setItem("talkio_user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("talkio_token");
    localStorage.removeItem("talkio_user");
    set({ user: null, token: null });
  }
}));
