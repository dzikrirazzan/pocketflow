import { createContext, useContext, useEffect, useState, PropsWithChildren } from "react";
import { Alert } from "react-native";
import { supabase, demoMode } from "@/lib/supabase";

type User = {
  id: string;
  email: string;
};

type AuthContextType = {
  isSignedIn: boolean;
  isLoading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      if (demoMode || data.session?.user) {
        const u = data.session?.user;
        setUser(
          demoMode
            ? { id: "demo", email: "demo@pocketflow.app" }
            : u
              ? { id: u.id, email: u.email ?? "" }
              : null
        );
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? "" });
      } else if (!demoMode) {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<boolean> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert("Sign in failed", error.message);
      return false;
    }
    return true;
  }

  async function signUp(email: string, password: string): Promise<boolean> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Sign up failed", error.message);
      return false;
    }
    Alert.alert(
      "Account created",
      "Kalau Supabase meminta email confirmation, cek email dulu sebelum login."
    );
    return true;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: demoMode || !!user,
        isLoading,
        user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
