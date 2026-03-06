const NAV = [
  { icon: '🧠', label: 'BRD Analyzer'   },
  { icon: '🗺️', label: 'Semantic Layer' },
  { icon: '📂', label: 'DDL History'    },
  { icon: '📋', label: 'Audit Log'      },
]

const NAV_TOOLS = [
  { icon: '⚡', label: 'Workflows'  },
  { icon: '📊', label: 'Insights'   },
]

export default function Sidebar({ activePage, onNavigate, user, onLogout, failedCount = 0 }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/jade-logo-white.png" alt="Jade Global" style={{ width:130, height:'auto', display:'block' }} />
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV.map(({ icon, label }) => (
          <div key={label} className={`nav-item${activePage===label?' active':''}`} onClick={() => onNavigate(label)}>
            <span className="nav-icon">{icon}</span>
            {label}
            {activePage===label && <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'var(--teal)', flexShrink:0 }} />}
          </div>
        ))}

        <div className="nav-section-label" style={{ marginTop:12 }}>Administration</div>
        {NAV_TOOLS.map(({ icon, label }) => (
          <div key={label} className={`nav-item${activePage===label?' active':''}`} onClick={() => onNavigate(label)}
            style={{ position:'relative' }}>
            <span className="nav-icon">{icon}</span>
            {label}
            {/* Badge for failed workflows on Workflows nav item */}
            {label==='Workflows' && failedCount > 0 && (
              <span style={{ marginLeft:'auto', minWidth:18, height:18, borderRadius:9, background:'#ef4444', color:'#fff', fontSize:9.5, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', flexShrink:0 }}>
                {failedCount}
              </span>
            )}
            {activePage===label && failedCount===0 && <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'var(--teal)', flexShrink:0 }} />}
          </div>
        ))}
      </nav>

      {/* Pro badge */}
      <div className="sidebar-pro-badge">
        <div className="pro-badge-icon">⚡</div>
        <div className="pro-badge-title">SchemaPilot Pro</div>
        <div className="pro-badge-sub">Enterprise Edition</div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <a onClick={() => onNavigate('Settings')}><span>⚙️</span> Settings</a>
        <a onClick={() => {}}><span>❓</span> Help & Support</a>
        {user && (
          <a onClick={onLogout} style={{ color:'rgba(239,68,68,.6)' }}>
            <span>🚪</span> Sign out ({user.username})
          </a>
        )}
      </div>
    </aside>
  )
}
