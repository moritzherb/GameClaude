import { useState } from 'react';
import BigButton from '../components/BigButton';
import Logo from '../components/Logo';
import { t } from '../i18n';

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
          <h1 className="headline">{t('No worries.')}</h1>
          <p className="lead">{t('Come back when you’re old enough. Juice is great too.')}</p>
          <BigButton variant="glass" onClick={() => setTooYoung(false)}>
            {t('Go back')}
          </BigButton>
        </div>
      ) : (
        <div className="gate-body fade-up">
          <div className="gate-big" aria-hidden>
            18<span>+</span>
          </div>
          <h1 className="headline">{t('Are you of legal drinking age?')}</h1>
          <p className="lead">{t('Party games for pregames, house parties and everything after.')}</p>
          <div className="stack">
            <BigButton size="xl" onClick={onConfirm}>
              {t('Yes, let’s go')}
            </BigButton>
            <BigButton variant="glass" onClick={() => setTooYoung(true)}>
              {t('Not yet')}
            </BigButton>
          </div>
        </div>
      )}
    </main>
  );
}
