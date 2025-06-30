import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  scheme: 'credify',          // <– one place only
  extra: {
    SUPABASE_URL:  process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY:  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
}); 