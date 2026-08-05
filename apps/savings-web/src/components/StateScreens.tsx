import { useState, type FormEvent } from 'react';
import { EyeIcon, RefreshIcon } from './Icons';

export function LoadingScreen() {
  return (
    <main className="shell" aria-busy="true" aria-label="טוען את תיק החסכונות">
      <div className="skeleton skeleton-header" />
      <div className="panel section skeleton-panel">
        <div className="skeleton skeleton-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="skeleton skeleton-field" key={index} />
          ))}
        </div>
        <div className="stats">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton skeleton-stat" key={index} />
          ))}
        </div>
      </div>
      <div className="grid">
        <div className="panel section skeleton-panel" />
        <div className="panel section skeleton-panel" />
      </div>
      <span className="sr-only">הנתונים נטענים</span>
    </main>
  );
}

type ErrorScreenProps = {
  readonly onRetry: () => void;
};

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <main className="centered-screen">
      <section className="state-card panel" role="alert">
        <div className="state-symbol" aria-hidden="true">
          !
        </div>
        <h1>לא הצלחנו לטעון את התיק</h1>
        <p>בדקו את החיבור ונסו שוב. השינויים בשרת לא הושפעו.</p>
        <button className="primary button-with-icon" type="button" onClick={onRetry}>
          <RefreshIcon />
          נסו שוב
        </button>
      </section>
    </main>
  );
}

type LoginScreenProps = {
  readonly onLogin: (password: string) => Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!password.trim()) {
      setError('יש להזין סיסמה.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onLogin(password);
    } catch {
      setError('הסיסמה שגויה או שהשרת אינו זמין. נסו שוב.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="centered-screen auth-screen">
      <section className="auth-card panel">
        <div className="brand auth-brand">
          <div className="mark" aria-hidden="true">
            %
          </div>
          <div>
            <span className="eyebrow">MMPS SAVINGS</span>
            <h1>איזון חסכונות</h1>
          </div>
        </div>
        <p className="auth-copy">הזינו את הסיסמה המשותפת כדי לצפות בתיק ולעדכן אותו.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="shared-password">סיסמה</label>
          <div className="password-field">
            <input
              id="shared-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
            >
              <EyeIcon crossed={showPassword} />
            </button>
          </div>
          {error ? (
            <p className="field-error" id="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" aria-hidden="true" /> : null}
            {isSubmitting ? 'מתחברים…' : 'כניסה לתיק'}
          </button>
        </form>
      </section>
    </main>
  );
}
