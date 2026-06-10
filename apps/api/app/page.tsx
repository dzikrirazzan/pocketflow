import { PocketFlowWebApp } from "./web-app";

export default function Home() {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  return (
    <PocketFlowWebApp
      config={{
        supabaseUrl,
        supabaseAnonKey,
        isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
      }}
    />
  );
}
