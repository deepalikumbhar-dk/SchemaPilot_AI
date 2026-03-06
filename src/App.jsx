import { useState, useCallback, useEffect } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import Sidebar from './components/Sidebar.jsx'
import BrdAnalyzer from './pages/BrdAnalyzer.jsx'
import WorkflowManager from './pages/WorkflowManager.jsx'
import InsightsDashboard from './pages/InsightsDashboard.jsx'
import { SemanticLayer, DdlHistory, AuditLog, Settings } from './pages/index.jsx'

const INITIAL_STATE = {
  brdText: '', intentResult: null, mappingResult: null,
  ddlResult: null, pipelineRan: false, activeStep: 0,
  stats: { tables: 0, relations: 0 },
  auditLogs: [],
}

const PAGE_TITLES = {
  'BRD Analyzer':   'Enterprise Data Health Assessment',
  'Semantic Layer': 'Snowflake Schema Browser',
  'DDL History':    'Generated DDL Scripts',
  'Audit Log':      'Pipeline Run History',
  'Workflows':      'Workflow Management',
  'Insights':       'Data Insights Dashboard',
  'Settings':       'Configuration & API Keys',
}

// ── Seed realistic demo workflow data ───────────────────────────
function seedWorkflows() {
  const brdPreviews = [
    { preview: 'Healthcare Analytics Platform — patient claims…', type: 'NEW',         tables: 6, alters: 0, rels: 5, reuse: 0, acc: 97, ms: 18400 },
    { preview: 'Enhancement — ALTER PATIENTS and CLAIMS tables…', type: 'ENHANCEMENT', tables: 1, alters: 2, rels: 3, reuse: 2, acc: 94, ms: 14200 },
    { preview: 'Inventory Management System — warehouse tracking…',type: 'NEW',        tables: 8, alters: 0, rels: 7, reuse: 0, acc: 96, ms: 21000 },
    { preview: 'Finance Module — GL accounts, cost centres…',     type: 'NEW',         tables: 5, alters: 0, rels: 4, reuse: 0, acc: 98, ms: 16800 },
    { preview: 'CRM Enhancement — add lead scoring columns…',     type: 'ENHANCEMENT', tables: 2, alters: 3, rels: 2, reuse: 3, acc: 92, ms: 12600 },
  ]
  const statuses = ['completed', 'completed', 'completed', 'failed', 'completed']
  const base = Date.now() - 7 * 24 * 60 * 60 * 1000

  return brdPreviews.map((b, i) => {
    const startedAt = base + i * 26 * 60 * 60 * 1000
    const steps = [
      { key:'intent',  label:'Intent Extraction', icon:'🧠', status: statuses[i]==='failed'&&i===3 ? (i===3?'done':'done') : 'done',   durationMs: 4200 + i*300 },
      { key:'mapping', label:'Semantic Mapping',  icon:'🗺️', status: statuses[i]==='failed'&&i===3 ? 'failed' : 'done', durationMs: statuses[i]==='failed'&&i===3?null:5800 + i*400 },
      { key:'ddl',     label:'DDL Generation',    icon:'⚙️', status: statuses[i]==='failed'&&i===3 ? 'pending': 'done', durationMs: statuses[i]==='failed'&&i===3?null:8400 + i*500 },
    ]
    return {
      id: `wf_seed_${i}`, status: statuses[i], startedAt, completedAt: startedAt + b.ms,
      totalMs: b.ms, brdPreview: b.preview, brdText: '', steps,
      tables: b.tables, alters: b.alters, relations: b.rels,
      reuseCount: b.reuse, newCount: b.tables, brdType: b.type,
      accuracy: b.acc, rerunCount: statuses[i]==='failed' ? 0 : 0,
      error: statuses[i]==='failed' ? 'OpenAI rate limit exceeded — retry after 60s' : null,
    }
  })
}

// ── Toast notification renderer ───────────────────────────────
function ToastContainer({ notifications, onDismiss }) {
  if (!notifications.length) return null
  return (
    <div style={{ position:'fixed', top:70, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8, minWidth:300, maxWidth:360 }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          background:'#fff', border:`1.5px solid ${n.type==='success'?'rgba(13,158,120,.35)':n.type==='error'?'rgba(239,68,68,.35)':n.type==='warn'?'rgba(245,158,11,.35)':'rgba(59,130,246,.35)'}`,
          borderRadius:12, padding:'13px 16px', boxShadow:'0 8px 32px rgba(0,0,0,.12)',
          display:'flex', alignItems:'flex-start', gap:11, animation:'slideIn .25s ease',
        }}>
          <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            background: n.type==='success'?'var(--teal-light)':n.type==='error'?'var(--red-light)':n.type==='warn'?'var(--amber-light)':'var(--blue-light)',
          }}>
            {n.type==='success'?'✓':n.type==='error'?'✗':n.type==='warn'?'⚠':'ℹ'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-dark)', marginBottom:2 }}>{n.title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5, wordBreak:'break-word' }}>{n.message}</div>
          </div>
          <button onClick={()=>onDismiss(n.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-light)', fontSize:16, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [user,          setUser]          = useState(null)
  const [page,          setPage]          = useState('BRD Analyzer')
  const [appState,      setAppState]      = useState(INITIAL_STATE)
  const [apiKey,        setApiKey]        = useState('')
  const [workflows,     setWorkflows]     = useState(seedWorkflows)
  const [notifications, setNotifications] = useState([])

  const update = patch => setAppState(prev => ({ ...prev, ...patch }))

  // ── Notification helpers ─────────────────────────
  const notify = useCallback(({ type, title, message }) => {
    const id = `notif_${Date.now()}_${Math.random()}`
    setNotifications(prev => [{ id, type, title, message }, ...prev.slice(0, 4)])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000)
  }, [])

  const dismissNotif = useCallback(id => setNotifications(prev => prev.filter(n => n.id !== id)), [])

  // ── Workflow CRUD helpers ────────────────────────
  const onWorkflowCreate = useCallback(wf => {
    setWorkflows(prev => [wf, ...prev])
  }, [])

  const onWorkflowStep = useCallback((wfId, steps) => {
    setWorkflows(prev => prev.map(w => w.id === wfId ? { ...w, steps } : w))
  }, [])

  const onWorkflowComplete = useCallback((wfId, patch) => {
    setWorkflows(prev => prev.map(w => w.id === wfId ? { ...w, ...patch } : w))
    notify({ type:'success', title:'Workflow Complete', message:`Pipeline finished successfully` })
  }, [notify])

  const onWorkflowFail = useCallback((wfId, patch) => {
    setWorkflows(prev => prev.map(w => w.id === wfId ? { ...w, ...patch } : w))
    notify({ type:'error', title:'Workflow Failed', message: patch.error?.slice(0,80) || 'Pipeline encountered an error' })
  }, [notify])

  const workflowHooks = { onWorkflowCreate, onWorkflowStep, onWorkflowComplete, onWorkflowFail, notify }

  // ── Re-run a failed workflow ─────────────────────
  const rerunWorkflow = useCallback((wf) => {
    if (!wf.brdText) {
      notify({ type:'warn', title:'Cannot Re-run', message:'BRD text not available for this workflow (demo data).' })
      return
    }
    setPage('BRD Analyzer')
    update({ brdText: wf.brdText })
    setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, rerunCount: (w.rerunCount||0)+1 } : w))
    notify({ type:'info', title:'Re-running Pipeline', message:'Switched to BRD Analyzer — click ⚡ Run AI Pipeline' })
  }, [notify])

  const unreadCount = notifications.length
  const failedCount = workflows.filter(w => w.status === 'failed').length

  if (!user) return <LoginPage onLogin={setUser} />

  const pages = {
    'BRD Analyzer':   <BrdAnalyzer  state={appState} update={update} apiKey={apiKey} workflowHooks={workflowHooks} />,
    'Semantic Layer': <SemanticLayer />,
    'DDL History':    <DdlHistory   state={appState} />,
    'Audit Log':      <AuditLog     state={appState} />,
    'Workflows':      <WorkflowManager workflows={workflows} onRerun={rerunWorkflow} onNavigate={setPage} notify={notify} />,
    'Insights':       <InsightsDashboard workflows={workflows} />,
    'Settings':       <Settings     apiKey={apiKey} onApiKeyChange={setApiKey} />,
  }

  return (
    <div className="shell">
      <Sidebar activePage={page} onNavigate={setPage} user={user} onLogout={() => setUser(null)} failedCount={failedCount} />

      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-app-icon">🧭</div>
            <div className="topbar-title">Schema<span>Pilot AI</span></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="topbar-right">{PAGE_TITLES[page]}</div>

            {/* Notification bell */}
            <button onClick={() => setPage('Workflows')} style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:'6px 8px', borderRadius:8, color:'var(--text-muted)', fontSize:18, transition:'background .15s' }}
              title="Workflow Notifications"
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-light)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, borderRadius:8, background:'var(--red)', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User chip */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:30, padding:'5px 14px 5px 6px', cursor:'default' }}>
              <div style={{ width:27, height:27, borderRadius:'50%', background:'linear-gradient(135deg, var(--jade-navy), var(--teal))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11.5, fontWeight:700, flexShrink:0 }}>
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-dark)', lineHeight:1.1 }}>{user.username}</div>
                <div style={{ fontSize:10.5, color:'var(--text-light)', lineHeight:1.1 }}>{user.role}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="page">{pages[page]}</div>
      </main>

      {/* Toast notifications */}
      <ToastContainer notifications={notifications} onDismiss={dismissNotif} />

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  )
}
