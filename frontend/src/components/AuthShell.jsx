import { BrandMark, Icon } from './Icons';

const FEATURES = [
  { icon: 'wallet', text: 'See income, spending, and budgets at a glance.' },
  { icon: 'briefcase', text: 'Keep projects and deadlines moving without the noise.' },
  { icon: 'checkSquare', text: 'A gentle daily task list that fits your real life.' },
  { icon: 'heart', text: 'Private health habits and trends, all in one place.' },
];

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-label="About My Life Dashboard">
        <div className="auth-aside__glow auth-aside__glow--one" aria-hidden="true" />
        <div className="auth-aside__glow auth-aside__glow--two" aria-hidden="true" />

        <div className="auth-aside__brand">
          <BrandMark size={40} />
          <span>
            <strong>My Life</strong>
            <small>Dashboard</small>
          </span>
        </div>

        <div className="auth-aside__content">
          <p className="eyebrow eyebrow--light">One calm place</p>
          <h1>
            Money, work, tasks, and health — in one gentle rhythm.
          </h1>
          <p className="auth-aside__lede">
            A personal dashboard designed to keep the important things visible, and the
            clutter out of the way.
          </p>
          <ul className="auth-features">
            {FEATURES.map((feature) => (
              <li key={feature.text}>
                <span className="auth-features__icon" aria-hidden="true">
                  <Icon name={feature.icon} size={17} />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-aside__footer">
          <Icon name="shield" size={16} />
          Private by design. Your data is only yours.
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <BrandMark size={34} />
            <span>My Life Dashboard</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
