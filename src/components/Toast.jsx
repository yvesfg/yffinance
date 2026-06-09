import React, { useEffect } from 'react';
import { T } from '../constants.js';

export default function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [msg]);

  if (!msg) return null;

  const border = type === 'success' ? 'rgba(5,212,155,.4)' : type === 'error' ? 'rgba(240,79,110,.4)' : T.border2;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      background: T.bg3, border: `1px solid ${border}`,
      color: T.txt, padding: '11px 16px', borderRadius: T.radius2,
      fontSize: 13, zIndex: 9999, maxWidth: 320,
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      animation: 'fadeIn .2s ease',
    }}>
      {msg}
    </div>
  );
}
