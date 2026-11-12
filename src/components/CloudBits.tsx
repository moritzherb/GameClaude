import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { isNative, toNative } from '../lib/native';
import { CloudError } from '../net/cloud';

/** What went wrong talking to the server, in words. */
export function cloudMessage(e: unknown) {
  const kind = e instanceof CloudError ? e.kind : 'failed';
  if (kind === 'offline') return t('No connection. Try again with internet.');
  if (kind === 'not-found') return t('Nothing found under this code.');
  if (kind === 'too-big') return t('Too big to save.');
  return t('That didn’t work. Try again in a moment.');
}

/** A call to the server while a sheet is open: busy, then its result or what went wrong. */
export function useCloud<T>(run: (() => Promise<T>) | null) {
  const [state, setState] = useState<{ busy: boolean; value?: T; error?: string }>({ busy: !!run });
  useEffect(() => {
    if (!run) return;
    let alive = true;
    setState({ busy: true });
    run().then(
      (value) => alive && setState({ busy: false, value }),
      (e) => alive && setState({ busy: false, error: cloudMessage(e) }),
    );
    return () => {
      alive = false;
    };
  }, [run]);
  return state;
}

/** A code shown big, to read out, and a button to send it on. */
export function CodeCard({ code, text }: { code: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const send = async () => {
    sfx.pop();
    buzz();
    if (isNative) return toNative({ type: 'share', title: 'prost!', text, url: '' });
    try {
      if (navigator.share) return await navigator.share({ text });
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* cancelled */
    }
  };
  return (
    <div className="cloud-code">
      <span className="cloud-code-value">{code}</span>
      <button type="button" className={`text-btn cloud-send${copied ? ' confirmed' : ''}`} onClick={() => void send()}>
        <span key={copied ? 'copied' : 'send'} className="swap-in">
          {copied ? t('Copied') : t('Send it')}
        </span>
      </button>
    </div>
  );
}

/** Type a code, then go. */
export function CodeForm({ length, label, busy, onSubmit }: { length: number; label: string; busy: boolean; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (
    <form
      className="join-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length >= length && !busy) onSubmit(clean);
      }}
    >
      <input
        type="search"
        name="prost-code"
        className="code-input"
        value={code}
        placeholder={t('CODE')}
        maxLength={length + Math.floor(length / 4)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="go"
        aria-label={label}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button type="submit" className="join-btn" disabled={clean.length < length || busy}>
        {busy ? '…' : t('Go')}
      </button>
    </form>
  );
}
