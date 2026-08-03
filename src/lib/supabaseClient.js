import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SB_URL || 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
const SB_KEY = import.meta.env.VITE_SB_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTA2MDEsImV4cCI6MjA5NjIyNjYwMX0.9iMmShZXsYxXpgYrtUPdeXN25fbRgkHvf0hWwmO5414';

// detectSessionInUrl explícito: é ele quem troca o ?code= do retorno do Google
// por sessão. Estava implícito (default true) enquanto o App.jsx também chamava
// exchangeCodeForSession() na mão — os dois disputavam o mesmo code (uso único)
// e o mesmo code_verifier, o segundo falhava e a sessão nunca era criada.
// Mesma configuração do controle-operacional (src/supabaseAuth.js).
export const supabase = createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'yff_supa_auth',
  },
});
