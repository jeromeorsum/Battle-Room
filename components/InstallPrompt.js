import { useEffect, useState } from 'react';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know it's relevant
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed, never show
    const wasDismissed = localStorage.getItem('battleroom-install-dismissed') === 'true';
    if (wasDismissed) return;

    if (isIOS()) {
      setDismissed(false);
      return;
    }

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('battleroom-install-dismissed', 'true');
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIOSInstructions(true);
      return; // don't dismiss yet, let them read the instructions
    }
    dismiss();
  }

  if (dismissed) return null;

  return (
    <div className="card" style={{ borderColor: 'var(--cyan)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div>
        <b>📲 Install Battle Room</b>
        <p className="dim" style={{ margin: '4px 0 0' }}>
          {showIOSInstructions
            ? 'Tap the Share icon in Safari, then "Add to Home Screen." This also unlocks push notifications on iPhone.'
            : 'Add it to your home screen for faster access and to enable push notifications.'}
        </p>
      </div>
      <div className="row">
        {!showIOSInstructions && <button className="btn" onClick={install}>Install</button>}
        <button className="btn ghost" onClick={dismiss}>{showIOSInstructions ? 'Got it' : 'Not now'}</button>
      </div>
    </div>
  );
}
