import { useState } from 'react';
import BigButton from '../components/BigButton';
import Logo from '../components/Logo';

export default function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [tooYoung, setTooYoung] = useState(false);

  return (
    <main className="screen center-screen">
      <Logo />
      {tooYoung ? (
        <>
          <div className="mega-emoji wobble">🧃</div>
          <p className="big-text">No worries! Come back when you’re old enough.</p>
          <BigButton color="var(--cyan)" onClick={() => setTooYoung(false)}>
            ← OOPS, GO BACK
          </BigButton>
        </>
      ) : (
        <>
          <div className="mega-emoji wobble">🍻</div>
          <p className="big-text">Are you old enough to drink where you are?</p>
          <div className="stack">
            <BigButton color="var(--lime)" size="xl" tilt="left" onClick={onConfirm}>
              YES, LET’S GO!
            </BigButton>
            <BigButton color="var(--white)" tilt="right" onClick={() => setTooYoung(true)}>
              NOPE 🧃
            </BigButton>
          </div>
          <p className="fine-print">Drink responsibly. Water counts as a sip. Never drink and drive.</p>
        </>
      )}
    </main>
  );
}
