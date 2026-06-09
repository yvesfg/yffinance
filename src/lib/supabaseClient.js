import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SB_URL || 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
const SB_KEY = import.meta.env.VITE_SB_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjMwMDEsImV4cCI6MjA2NDY5OTAwMX0.SX9G4PEpFR0b9jlZAAmVB3xkZR6YhIAYQl1W2Rw5Rno';

export const supabase = createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
