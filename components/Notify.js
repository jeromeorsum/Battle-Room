import { useEffect, useState } from 'react';

// A tiny, dependency-free notification system that replaces the browser's
// jarring native alert()/confirm() popups with in-page UI that matches the
// site's dark theme.
//
// Usage from anywhere:
//   import { toast, confirmModal } from '../components/Notify';
//   toast('Saved.');                       // transient success/info/error message
//   toast('Could not save.', 'error');
//   if (!(await confirmModal('Delete this?'))) return;   // yes/no, resolves to boolean
//
// <NotifyHost /> is mounted once in _app.js. If for any reason the host
// isn't mounted yet, both helpers fall back to the native window.alert /
// window.confirm so no call site can ever silently break.

let hostApi = null; // set by <NotifyHost/> once mounted

export function toast(message, type = 'success') {
  if (hostApi) hostApi.addToast(String(message), type);
  else if (typeof window !== 'undefined') window.alert(String(message));
}

export function confirmModal(message) {
  if (hostApi) return hostApi.openConfirm(String(message));
  if (typeof window !== 'undefined') return Promise.resolve(window.confirm(String(message)));
  return Promise.resolve(false);
}

export function NotifyHost() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { message, resolve }

  useEffect(() => {
    hostApi = {
      addToast(message, type) {
        const id = Math.random().toString(36).slice(2);
        setToasts((list) => [...list, { id, message, type }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500);
      },
      openConfirm(message) {
        return new Promise((resolve) => setConfirmState({ message, resolve }));
      }
    };
    return () => { hostApi = null; };
  }, []);

  function answer(value) {
    if (confirmState) confirmState.resolve(value);
    setConfirmState(null);
  }

  const colorFor = (type) =>
    type === 'error' ? 'var(--pink, #ff5c7a)'
      : type === 'info' ? 'var(--cyan, #38bdf8)'
        : 'var(--green, #34d399)';

  return (
    <>
      {/* Toast stack — bottom center, above everything */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none', width: 'min(92vw, 420px)' }}>
        {toasts.map((t) => (
          <div key={t.id} role="status" style={{ pointerEvents: 'auto', background: 'var(--bg-raised, #1b1b22)', border: `1px solid ${colorFor(t.type)}`, color: 'var(--text, #f5f5f7)', padding: '10px 16px', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.35)', fontSize: 14, maxWidth: '100%', textAlign: 'center' }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div role="dialog" aria-modal="true" onClick={() => answer(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-raised, #1b1b22)', border: '1px solid var(--line, #2a2a33)', borderRadius: 14, padding: 22, width: 'min(92vw, 400px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            <p style={{ margin: '0 0 18px', color: 'var(--text, #f5f5f7)', fontSize: 15, lineHeight: 1.5 }}>{confirmState.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => answer(false)}>Cancel</button>
              <button className="btn" onClick={() => answer(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
