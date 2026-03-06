export function PageHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h1 style={{ fontFamily: 'var(--font)', fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.4px' }}>{title}</h1>
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontFamily: 'var(--mono)' }}>{subtitle}</span>
    </div>
  )
}

export function ProgressBar({ pct }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

export function Alert({ type = 'info', children }) {
  const icons = { success: '✓', error: '✗', info: 'ℹ', warn: '⚠' }
  return (
    <div className={`alert alert-${type}`}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{icons[type]}</span>
      <span>{children}</span>
    </div>
  )
}

export function SqlCode({ code }) {
  const lines = (code || '').split('\n').map((line, i) => {
    const t = line.trim()
    let cls = ''
    if (/^--/.test(t)) cls = 'code-comment'
    else if (/^(CREATE|ALTER|DROP|INSERT|SELECT|WITH|FROM|WHERE|JOIN|ON|AS|UNION|SET|USE|GRANT|CALL)\b/i.test(t)) cls = 'code-kw'
    else if (/(VARCHAR|NUMBER|DATE|TIMESTAMP_NTZ|BOOLEAN|INTEGER|FLOAT|VARIANT)\b/i.test(line)) cls = 'code-type'
    else if (/(PRIMARY KEY|FOREIGN KEY|NOT NULL|UNIQUE|REFERENCES|CLUSTER BY|COMMENT ON|IF NOT EXISTS|OR REPLACE|DEFAULT)\b/i.test(line)) cls = 'code-const'
    return <span key={i} className={cls}>{line}{'\n'}</span>
  })
  return <div className="code-wrap"><pre>{lines}</pre></div>
}
