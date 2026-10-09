import { Component, type ReactNode } from 'react';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import BigButton from './BigButton';

interface State {
  error: Error | null;
}

/**
 * If a screen crashes, show what happened and a way out instead of an empty dark page.
 * The error text is shown small, so a screenshot is enough to report it.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="screen">
        <div className="connecting">
          <div className="connecting-emoji">🫗</div>
          <h2 className="bd-title">{t('Oops, something spilled.')}</h2>
          <p className="lead">{t('This screen crashed. Your players and settings are safe.')}</p>
          <p className="fine-print crash-text">{`${error.name}: ${error.message}`.slice(0, 200)}</p>
        </div>
        <div className="sticky-action stack">
          <BigButton onClick={() => this.setState({ error: null })}>{t('Try again')}</BigButton>
          <BigButton
            variant="glass"
            onClick={() => {
              this.setState({ error: null });
              navigate(paths.home);
            }}
          >
            {t('Back to the start')}
          </BigButton>
        </div>
      </main>
    );
  }
}
