import { useState } from 'react';
import BigButton from '../components/BigButton';
import Logo from '../components/Logo';

export default function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [tooYoung, setTooYoung] = useState(false);

  return (
    <main className="screen gate">
      <div className="gate-top">
        <Logo size="lg" />
      </div>
      {tooYoung ? (
        <div className="gate-body fade-up">
          <div className="gate-emoji">🧃</div>
          <h1 className="headline">No worries.</h1>
          <p className="lead">Come back when you’re old enough. Juice is great too.</p>
          <BigButton variant="glass" onClick={() => setTooYoung(false)}>
            Go back
          </BigButton>
        </div>
      ) : (
        <div className="gate-body fade-up">
          <div className="gate-emoji">🥂</div>
          <h1 className="headline">Are you of legal drinking age?</h1>
          <p className="lead">Party games for pregames, house parties and everything after.</p>
          <div className="stack">
            <BigButton size="xl" onClick={onConfirm}>
              Yes, let’s go
            </BigButton>
            <BigButton variant="glass" onClick={() => setTooYoung(true)}>
              Not yet
            </BigButton>
          </div>
          <p className="fine-print">Drink responsibly. Every sip can be water. Never drink and drive.</p>
        </div>
      )}
    </main>
  );
}
