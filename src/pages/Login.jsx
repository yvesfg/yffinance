import React, { useState } from 'react';
import { T } from '../constants.js';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');


  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
          <span style={{ color: T.txt }}>YF</span><span style={{ color: T.green }}>Finance</span>
        </div>
        <div style={{ fontSize: 12, color: T.txt3, letterSpacing: 4, textTransform: 'uppercase', marginTop: 8 }}>
          Sistema Financeiro Pessoal &amp; Empresarial
        </div>
      </div>

      {/* Card de login */}
      <div style={{
        background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 18,
        padding: '36px 40px', width: 340, maxWidth: '90vw', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: T.txt, margin: '0 0 8px' }}>
          Entrar
        </h2>
        <p style={{ fontSize: 13, color: T.txt3, margin: '0 0 28px', lineHeight: 1.5 }}>
          Use sua conta Google para acessar o sistema
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: T.radius2,
            background: loading ? T.bg3 : '#fff', color: '#1a1a1a',
            border: `1px solid ${T.border2}`, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'opacity .2s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#fff'; }}
        >
          {/* Google icon */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>

        {error && (
          <div style={{ marginTop: 16, fontSize: 12, color: T.red, background: T.redGlow, borderRadius: T.radius2, padding: '8px 12px' }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: T.txt3, letterSpacing: 1 }}>
        by YFGroup
      </div>
    </div>
  );
}
