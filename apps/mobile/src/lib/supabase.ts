import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false" || !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(supabaseUrl || "https://demo.supabase.co", supabaseAnonKey || "demo", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
