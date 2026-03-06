import { useState, useEffect } from 'react'
import { PageHeader, Alert, SqlCode } from '../components/UI.jsx'

/* ── Semantic Layer ──────────────────────────────────── */
export function SemanticLayer() {
  return (
    <>
      <PageHeader icon="🗺️" title="Semantic Layer Explorer" subtitle="Browse Snowflake schema knowledge base" />
      <Alert type="info">Connect Snowflake in <strong>Settings</strong> to browse live schema objects.</Alert>
      <div style={{ marginTop:20 }}>
        <div className="label" style={{ marginBottom:12 }}>How Semantic Mapping Works</div>
        <div className="panel">
          {[['🔍','Scan','Reads INFORMATION_SCHEMA from Snowflake'],['🔗','Match','Entities matched to existing objects via keyword similarity'],['♻️','Reuse','Overlapping tables flagged — no duplication'],['🆕','Create','New entities → CREATE TABLE']].map(([ic,s,d],i,arr)=>(
            <div key={s} style={{ display:'flex', gap:16, alignItems:'flex-start', padding:'16px 22px', borderBottom:i<arr.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ width:38, height:38, borderRadius:'var(--radius-md)', background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{ic}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-dark)', marginBottom:3 }}>{s}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ── DDL History ─────────────────────────────────────── */
export function DdlHistory({ state }) {
  const download = () => {
    if (!state.ddlResult) return
    const blob = new Blob([state.ddlResult], { type:'text/plain' })
    const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:'latest_schema.sql' })
    a.click()
  }
  return (
    <>
      <PageHeader icon="📂" title="DDL History" subtitle="Previously generated Snowflake DDL scripts" />
      {state.ddlResult ? (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">⚙️ Latest Generated Script</div>
            <button className="btn btn-teal-light" style={{ padding:'7px 16px', fontSize:13 }} onClick={download}>⬇ Download .sql</button>
          </div>
          <div style={{ padding:20 }}>
            <SqlCode code={state.ddlResult} />
            <div className="deploy-banner"><span>✓</span><strong>Ready for Snowflake Deployment</strong></div>
          </div>
        </div>
      ) : <Alert type="info">No DDL yet. Run the <strong>BRD Analyzer</strong> pipeline first.</Alert>}
    </>
  )
}

/* ── Audit Log ───────────────────────────────────────── */
export function AuditLog({ state }) {
  return (
    <>
      <PageHeader icon="📋" title="Audit Log" subtitle="Pipeline run history" />
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Total Runs',       value:state.auditLogs.length, color:'var(--jade-navy)', bg:'rgba(27,58,107,.07)', icon:'🏃' },
          { label:'Tables Generated', value:state.auditLogs.reduce((s,l)=>s+(l.tables||0),0), color:'var(--teal)', bg:'var(--teal-light)', icon:'🗄️' },
          { label:'Success Rate',     value:state.auditLogs.length?'100%':'—', color:'var(--green)', bg:'var(--green-light)', icon:'✅' },
        ].map(({ label,value,color,bg,icon })=>(
          <div key={label} style={{ background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 22px', display:'flex', alignItems:'center', gap:16, flex:1, boxShadow:'var(--shadow-sm)', minWidth:140 }}>
            <div style={{ width:40, height:40, borderRadius:'var(--radius-md)', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>{icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:3, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">📋 Recent Runs</div>
          <span style={{ fontSize:12, color:'var(--text-light)' }}>{state.auditLogs.length} total</span>
        </div>
        {state.auditLogs.length===0
          ? <div style={{ padding:'36px 22px', textAlign:'center', color:'var(--text-light)', fontSize:13 }}>No runs yet.</div>
          : (
            <table className="audit-table">
              <thead><tr>{['#','Timestamp','Tables','ALTERs','Status','BRD Preview'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {state.auditLogs.map((log,i)=>(
                  <tr key={i}>
                    <td style={{ color:'var(--text-light)', fontWeight:600 }}>#{i+1}</td>
                    <td style={{ fontFamily:'var(--mono)', fontSize:12 }}>{log.timestamp}</td>
                    <td><span className="tag tag-blue">{log.tables||0}</span></td>
                    <td><span className="tag tag-amber">{log.alters||0}</span></td>
                    <td><span className="tag tag-green">✓ {log.status}</span></td>
                    <td style={{ color:'var(--text-muted)', maxWidth:260, fontSize:12 }}>{log.brdPreview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────
   SETTINGS — with real Snowflake test via backend
───────────────────────────────────────────────────── */
export function Settings({ apiKey, onApiKeyChange }) {
  // OpenAI
  const [keyInput,  setKeyInput]  = useState(apiKey || '')
  const [showKey,   setShowKey]   = useState(false)
  const [keySaved,  setKeySaved]  = useState(false)
  const [keyTest,   setKeyTest]   = useState(null)

  // Snowflake — pre-filled from .env via backend
  const [sfAccount,   setSfAccount]   = useState('')
  const [sfUser,      setSfUser]      = useState('')
  const [sfPassword,  setSfPassword]  = useState('')
  const [sfShowPass,  setSfShowPass]  = useState(false)
  const [sfWarehouse, setSfWarehouse] = useState('COMPUTE_WH')
  const [sfDatabase,  setSfDatabase]  = useState('')
  const [sfSchema,    setSfSchema]    = useState('PUBLIC')
  const [sfRole,      setSfRole]      = useState('SYSADMIN')
  const [sfHasEnvPwd, setSfHasEnvPwd] = useState(false)
  const [sfSaved,     setSfSaved]     = useState(false)
  const [sfTest,      setSfTest]      = useState(null) // null|'testing'|{ok,version,user,database,error}
  const [sfLoaded,    setSfLoaded]    = useState(false)
  const [sfTab,       setSfTab]       = useState('Connection')

  // Load .env Snowflake config from backend on mount
  useEffect(() => {
    fetch('/api/snowflake/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.account)   setSfAccount(cfg.account)
        if (cfg.user)      setSfUser(cfg.user)
        if (cfg.warehouse) setSfWarehouse(cfg.warehouse)
        if (cfg.database)  setSfDatabase(cfg.database)
        if (cfg.schema)    setSfSchema(cfg.schema)
        if (cfg.role)      setSfRole(cfg.role)
        setSfHasEnvPwd(cfg.hasPassword)
        setSfLoaded(true)
      })
      .catch(() => setSfLoaded(true))
  }, [])

  const handleSaveKey = () => { onApiKeyChange(keyInput.trim()); setKeySaved(true); setTimeout(()=>setKeySaved(false),2500) }

  const handleTestKey = async () => {
    if (!keyInput.trim()) { setKeyTest('error'); return }
    setKeyTest('testing')
    try {
      const r = await fetch('/api/health', { headers:{ 'x-openai-key': keyInput.trim() } })
      setKeyTest(r.ok ? 'ok' : 'error')
    } catch { setKeyTest('error') }
  }

  const handleTestSnowflake = async () => {
    setSfTest('testing')
    try {
      const payload = { account:sfAccount, user:sfUser, warehouse:sfWarehouse, database:sfDatabase, schema:sfSchema, role:sfRole }
      // Only include password if user typed one (otherwise backend uses .env)
      if (sfPassword) payload.password = sfPassword
      const r = await fetch('/api/snowflake/test', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      const result = await r.json()
      setSfTest(result)
    } catch (e) { setSfTest({ ok:false, error:e.message }) }
  }

  const Field = ({ label, value, onChange, placeholder='', hint='' }) => (
    <div style={{ marginBottom:14 }}>
      <label className="label" style={{ marginBottom:7 }}>{label}</label>
      <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 13px', border:'1.5px solid var(--border-mid)', borderRadius:'var(--radius-md)', fontSize:13.5, color:'var(--text-body)', outline:'none', background:'var(--bg-light)', fontFamily:'var(--font)', transition:'border-color .15s' }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(13,158,120,.1)';e.target.style.background='#fff'}}
        onBlur={e=>{e.target.style.borderColor='var(--border-mid)';e.target.style.boxShadow='none';e.target.style.background='var(--bg-light)'}}
      />
      {hint && <div style={{ fontSize:11.5, color:'var(--text-light)', marginTop:4 }}>{hint}</div>}
    </div>
  )

  const PwdField = ({ label, value, onChange, show, onToggle, placeholder='', hint='' }) => (
    <div style={{ marginBottom:14 }}>
      <label className="label" style={{ marginBottom:7 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input type={show?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', padding:'10px 40px 10px 13px', border:'1.5px solid var(--border-mid)', borderRadius:'var(--radius-md)', fontSize:13.5, color:'var(--text-body)', outline:'none', background:'var(--bg-light)', fontFamily: show?'var(--mono)':'var(--font)', letterSpacing:show?'0.5px':value?'2px':'normal', transition:'border-color .15s' }}
          onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(13,158,120,.1)';e.target.style.background='#fff'}}
          onBlur={e=>{e.target.style.borderColor='var(--border-mid)';e.target.style.boxShadow='none';e.target.style.background='var(--bg-light)'}}
        />
        <button onClick={onToggle} type="button" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#9ca3af', padding:0 }}>
          {show?'🙈':'👁️'}
        </button>
      </div>
      {hint && <div style={{ fontSize:11.5, color:'var(--text-light)', marginTop:4 }}>{hint}</div>}
    </div>
  )

  return (
    <>
      <PageHeader icon="🔧" title="Settings" subtitle="API keys, Snowflake connection & model config" />

      {/* ═══ OpenAI Key ═══ */}
      <div className="panel" style={{ marginBottom:20 }}>
        <div className="panel-header">
          <div className="panel-title">🔑 OpenAI API Key</div>
          {apiKey ? <span className="tag tag-green">✓ Active</span> : <span className="tag tag-amber">⚠ Not Set</span>}
        </div>
        <div style={{ padding:'20px 24px' }}>
          <PwdField label="API Key" value={keyInput} onChange={v=>{setKeyInput(v);setKeySaved(false);setKeyTest(null)}}
            show={showKey} onToggle={()=>setShowKey(p=>!p)} placeholder="sk-••••••••••••••••••••" />
          {keyInput && !keyInput.startsWith('sk-') && <div style={{ fontSize:12, color:'#b45309', marginBottom:12 }}>⚠ Keys usually start with <code style={{ background:'#fef9c3', padding:'1px 5px', borderRadius:3 }}>sk-</code></div>}
          {keyInput && keyInput.startsWith('sk-') && <div style={{ fontSize:12, color:'var(--teal)', marginBottom:12 }}>✓ Format valid</div>}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button className="btn btn-navy" onClick={handleSaveKey} disabled={!keyInput.trim()} style={{ padding:'10px 22px' }}>
              {keySaved ? '✓ Saved!' : '💾 Save Key'}
            </button>
            <button className="btn btn-secondary" onClick={handleTestKey} disabled={!keyInput.trim()||keyTest==='testing'} style={{ padding:'10px 18px' }}>
              {keyTest==='testing' ? <><span className="spinner-dark" /> Testing…</> : '🔌 Test'}
            </button>
            {keyInput && <button className="btn btn-ghost" onClick={()=>{setKeyInput('');onApiKeyChange('');setKeyTest(null)}} style={{ padding:'10px 12px', color:'var(--red)' }}>🗑</button>}
          </div>
          {keyTest==='ok'    && <div style={{ marginTop:12 }}><Alert type="success">✓ OpenAI key valid and connected.</Alert></div>}
          {keyTest==='error' && <div style={{ marginTop:12 }}><Alert type="error">✗ Invalid key or backend not running.</Alert></div>}
          <div style={{ marginTop:18, padding:'12px 15px', background:'rgba(13,158,120,.05)', border:'1px solid rgba(13,158,120,.15)', borderRadius:'var(--radius-md)' }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'var(--teal-dark)', marginBottom:6 }}>🔒 Security</div>
            <ul style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:2.1, paddingLeft:16, margin:0 }}>
              <li>Stored in memory only — clears on refresh</li>
              <li>Sent to local backend via <code style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>x-openai-key</code> header</li>
              <li>Alternatively: set <code style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>OPENAI_API_KEY</code> in <code style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:3 }}>.env</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ Snowflake Connection ═══ */}
      <div className="panel" style={{ marginBottom:20 }}>
        <div className="panel-header">
          <div className="panel-title"><span style={{ fontSize:20, marginRight:6 }}>❄️</span> Snowflake Connection</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {sfLoaded && sfAccount && <span style={{ fontSize:12, color:'var(--text-light)', fontFamily:'var(--mono)' }}>{sfAccount}</span>}
            {sfLoaded && sfAccount
              ? <span className="tag tag-green">✓ .env loaded</span>
              : <span className="tag" style={{ background:'#f1f5f9', color:'var(--text-muted)', border:'1px solid var(--border)' }}>Not configured</span>}
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ padding:'0 22px', borderBottom:'1px solid var(--border)', display:'flex' }}>
          {['Connection','Advanced'].map(t=>(
            <button key={t} onClick={()=>setSfTab(t)} style={{ padding:'10px 18px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:sfTab===t?700:500, color:sfTab===t?'var(--teal)':'var(--text-muted)', borderBottom:`2px solid ${sfTab===t?'var(--teal)':'transparent'}`, fontFamily:'var(--font)', transition:'all .15s' }}>{t}</button>
          ))}
        </div>

        <div style={{ padding:'22px 24px' }}>
          {/* .env loaded notice */}
          {sfLoaded && sfAccount && (
            <div style={{ marginBottom:18 }}>
              <Alert type="info">
                ✓ Connection details loaded from <code>.env</code> file. You can override any field below.
                {sfHasEnvPwd ? ' Password is set in .env.' : ' Enter password manually.'}
              </Alert>
            </div>
          )}

          {sfTab === 'Connection' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Account Identifier" value={sfAccount} onChange={setSfAccount} placeholder="OXRBHLN-LVB44687" hint="From .env: SNOWFLAKE_ACCOUNT" />
                <Field label="Username" value={sfUser} onChange={setSfUser} placeholder="DEEPALIKUMBHAR" />
              </div>
              <PwdField label={sfHasEnvPwd ? 'Password (set in .env — leave blank to use it)' : 'Password'}
                value={sfPassword} onChange={setSfPassword} show={sfShowPass} onToggle={()=>setSfShowPass(p=>!p)}
                placeholder={sfHasEnvPwd ? '••• (using .env value)' : 'Enter Snowflake password'} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Database" value={sfDatabase} onChange={setSfDatabase} placeholder="SNOWFLAKE_LEARNING_DB" />
                <Field label="Schema" value={sfSchema} onChange={setSfSchema} placeholder="PUBLIC" />
              </div>
            </>
          )}

          {sfTab === 'Advanced' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Warehouse" value={sfWarehouse} onChange={setSfWarehouse} placeholder="COMPUTE_WH" hint="Virtual warehouse for queries" />
                <Field label="Role" value={sfRole} onChange={setSfRole} placeholder="SYSADMIN" hint="Role needs DDL privileges" />
              </div>
              <div style={{ padding:'13px 15px', background:'rgba(13,158,120,.05)', border:'1px solid rgba(13,158,120,.15)', borderRadius:'var(--radius-md)' }}>
                <div style={{ fontSize:12.5, fontWeight:700, color:'var(--teal-dark)', marginBottom:8 }}>Required Permissions</div>
                {['CREATE DATABASE','CREATE SCHEMA','CREATE TABLE','CREATE VIEW','CREATE PROCEDURE','CREATE TASK','CREATE STREAM','ALTER TABLE'].map(p=>(
                  <span key={p} className="tag tag-teal" style={{ fontSize:10.5, marginBottom:4 }}>{p}</span>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap', alignItems:'center' }}>
            <button className="btn btn-navy" style={{ padding:'10px 22px' }}
              onClick={()=>{setSfSaved(true);setSfTest(null);setTimeout(()=>setSfSaved(false),2500)}}
              disabled={!sfAccount||!sfUser||(sfPassword===''&&!sfHasEnvPwd)||!sfDatabase}>
              {sfSaved?'✓ Saved!':'💾 Save Connection'}
            </button>

            {/* REAL Snowflake test button */}
            <button className="btn btn-primary" style={{ padding:'10px 22px' }}
              onClick={handleTestSnowflake}
              disabled={!sfAccount||!sfUser||(sfPassword===''&&!sfHasEnvPwd)||sfTest==='testing'}>
              {sfTest==='testing'
                ? <><span className="spinner" /> Testing Snowflake…</>
                : '❄️ Test Connection'}
            </button>

            <button className="btn btn-ghost" style={{ padding:'10px 12px' }}
              onClick={()=>{setSfPassword('');setSfTest(null)}}>↺ Reset</button>
          </div>

          {/* Test results */}
          {sfTest && sfTest!=='testing' && (
            <div style={{ marginTop:14 }}>
              {sfTest.ok ? (
                <Alert type="success">
                  ✓ Connected to Snowflake!&nbsp;&nbsp;
                  <span style={{ fontFamily:'var(--mono)', fontSize:12 }}>
                    Version: {sfTest.version} | User: {sfTest.user} | DB: {sfTest.database}
                  </span>
                </Alert>
              ) : (
                <Alert type="error">✗ Connection failed: {sfTest.error}</Alert>
              )}
            </div>
          )}

          {/* Connection preview */}
          {sfAccount && sfUser && sfDatabase && (
            <div style={{ marginTop:18 }}>
              <div className="label" style={{ marginBottom:8 }}>Connection Preview</div>
              <div className="code-wrap" style={{ maxHeight:110 }}>
                <pre style={{ fontFamily:'var(--mono)', fontSize:12, color:'#a8c8e8', lineHeight:1.9 }}>
{`ACCOUNT   = ${sfAccount}
USER      = ${sfUser}
DATABASE  = ${sfDatabase}
SCHEMA    = ${sfSchema||'PUBLIC'}
WAREHOUSE = ${sfWarehouse||'COMPUTE_WH'}
ROLE      = ${sfRole||'SYSADMIN'}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Model Config + Quick Start ═══ */}
      <div className="settings-grid">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">⚙️ Model Configuration</div></div>
          <div style={{ padding:'16px 22px' }}>
            {[['Model','gpt-4o-mini'],['Temperature','0.3'],['Max Tokens','4,000'],['DDL Objects','Tables, Views, Procedures, Tasks, Streams'],['OpenAI Key',apiKey?'🟢 UI Settings':'⚠ Not set'],['Snowflake',sfAccount?`🟢 ${sfAccount}`:'⚠ Not configured']].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:13, borderBottom:'1px solid var(--border)', gap:10 }}>
                <span style={{ color:'var(--text-muted)', flexShrink:0 }}>{k}</span>
                <span style={{ fontWeight:600, color:'var(--text-dark)', fontFamily:'var(--mono)', fontSize:12, textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">🚀 Quick Start</div></div>
          <div style={{ padding:'14px 20px' }}>
            <div className="code-wrap" style={{ maxHeight:220 }}>
              <pre style={{ fontFamily:'var(--mono)', fontSize:12, color:'#a8c8e8', lineHeight:2 }}>{`# Install
npm install

# Configure .env
OPENAI_API_KEY=sk-your-key
SNOWFLAKE_ACCOUNT=ORGNAME-ACCOUNT
SNOWFLAKE_USER=USERNAME
SNOWFLAKE_PASSWORD=yourpassword
SNOWFLAKE_DATABASE=MY_DB
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=SYSADMIN

# Start
npm run dev
# → http://localhost:3000
# Login: admin / jade@2026`}</pre>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
