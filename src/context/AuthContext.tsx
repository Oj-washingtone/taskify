import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types/user.types";
import { getProfile } from "@/api/account";
import { tokenStorage } from "@/api/tokenStorage";
import { authEvents } from "@/api/authEvents";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        // Try loading from local cache for instant startup
        const cachedStr = await AsyncStorage.getItem('USER_PROFILE');
        if (cachedStr) {
          setUser(JSON.parse(cachedStr));
          setIsLoading(false); // Drop splash screen instantly
          
          // Silently sync profile in background
          getProfile().then(profile => {
            setUser(profile);
            AsyncStorage.setItem('USER_PROFILE', JSON.stringify(profile));
          }).catch(err => console.error("Background auth sync failed:", err));
        } else {
          // Fresh login, block until fetched
          const profile = await getProfile();
          setUser(profile);
          await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(profile));
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await tokenStorage.clearToken();
    await AsyncStorage.removeItem('USER_PROFILE');
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
    
    // Listen to force logout events from API interceptors
    const sub = authEvents.onForceLogout(() => {
      logout();
    });
    return () => sub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
