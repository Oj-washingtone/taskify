import { User } from "@/types/user.types";
import { api, authApi } from "./client";
import { tokenStorage } from "./tokenStorage";

export interface UserPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function signup(user: UserPayload): Promise<AuthResponse> {
  const { data } = await authApi.post("/auth/register", user);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function loginWithEmail(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await authApi.post("/auth/login", credentials);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    await tokenStorage.clearToken();
  }
}

export interface SocialLoginPayload {
  provider: 'google' | 'github';
  idToken?: string;
  accessToken?: string;
  email?: string;
  providerId?: string;
  name?: string;
  avatarUrl?: string;
}

export async function socialLogin(payload: SocialLoginPayload): Promise<AuthResponse> {
  const { data } = await authApi.post("/auth/social", payload);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}
