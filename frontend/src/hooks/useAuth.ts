import { useNavigate } from "react-router-dom";
import { login, register, type AuthPayload, type RegisterPayload } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutStore = useAuthStore((state) => state.logout);

  const signIn = async (payload: AuthPayload) => {
    const result = await login(payload);
    setAuth(result.user, result.token);
    navigate("/");
  };

  const signUp = async (payload: RegisterPayload) => {
    const result = await register(payload);
    setAuth(result.user, result.token);
    navigate("/");
  };

  const logout = () => {
    logoutStore();
    navigate("/login");
  };

  return { signIn, signUp, logout };
}
