const HIGHLIGHTS = [
  'Track every order in one place',
  'Save your cart across devices',
  'Members-only prices and early drops',
]

/** The split screen shared by the login and register pages. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__aside-top">
          <span className="brand brand--light">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="brand__name">
              Shop<span className="brand__accent">Kart</span>
            </span>
          </span>

          <h2 className="auth__tagline">
            Everything you need,
            <br />
            delivered tomorrow.
          </h2>

          <ul className="auth__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <span className="auth__tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__note">Trusted by 2 million shoppers across India.</p>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <header className="auth__header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>

          {children}

          {footer && <footer className="auth__footer">{footer}</footer>}
        </div>
      </main>
    </div>
  )
}
