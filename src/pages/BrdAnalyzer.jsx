import { useState, useRef } from 'react'
import { ProgressBar, MetricCard, Alert, SqlCode } from '../components/UI.jsx'
import { usePipeline } from '../hooks/usePipeline.js'

/* ── Sample BRDs ──────────────────────────────────── */
const SAMPLE_NEW = `Business Requirements Document — Healthcare Analytics Platform
Type: NEW BUILD — All tables to be created from scratch

Objective: Build a Snowflake data warehouse to track patient claims, clinical operations,
and compliance reporting for a multi-department hospital network.

Entities Required (ALL NEW):
1. Patients — Demographics, insurance_id, primary_physician, enrollment_date, risk_tier
2. Claims — claim_id, patient_id (FK), service_date, billed_amount, payer, status
3. Claim Line Items — line_id, claim_id (FK), cpt_code, icd10_code, units, allowed_amount
4. Providers — provider_id, npi_number, specialty, department_id, contract_type
5. Departments — department_id, name, head_physician, cost_center
6. Audit Trail — audit_id, claim_id (FK), changed_by, change_type, old_value, new_value, changed_at

Business Rules:
- Claims must link to valid provider NPI
- PII fields (SSN, DOB) must be tagged for masking
- Claim total = sum of all line item allowed_amounts

Stored Procedures Needed:
- sp_calculate_denial_rate(dept_id) — calculates denial rate per department
- sp_flag_high_risk_patients() — marks patients with risk_score > 7.5 as high_risk

Tasks Needed:
- task_nightly_denial_refresh — runs nightly at midnight UTC
- task_weekly_audit_cleanup — runs every Sunday, archives audit rows older than 90 days

Streams Needed:
- stream_claims_changes — CDC stream on CLAIMS table

Reporting Requirements:
- Denial rate dashboard (target < 20%)
- Claims by department breakdown
- Top 10 providers by claim amount
- Monthly billed vs paid trend`

const SAMPLE_ENHANCE = `Business Requirements Document — Healthcare Platform Enhancement
Type: ENHANCEMENT — Alter ONLY existing PATIENTS and CLAIMS tables.

Existing tables (DO NOT recreate):
- HEALTHCARE_DB.HEALTHCARE.PATIENTS (patient_id, full_name, insurance_id, enrollment_date, risk_tier)
- HEALTHCARE_DB.HEALTHCARE.CLAIMS (claim_id, patient_id, billed_amount, claim_status, service_date)

Enhancement 1 — ALTER TABLE PATIENTS — Add columns:
- risk_score       NUMBER(5,2) DEFAULT 0.00
- preferred_language VARCHAR(50) DEFAULT 'English'
- is_high_risk     BOOLEAN DEFAULT FALSE
- last_contact_date DATE

Enhancement 2 — ALTER TABLE CLAIMS — Add columns:
- denial_reason_code   VARCHAR(20)
- ai_predicted_denial  BOOLEAN DEFAULT FALSE
- resubmission_count   NUMBER(3,0) DEFAULT 0
- paid_amount          NUMBER(12,2)

New Table: AI_PREDICTIONS — prediction_id (PK), claim_id (FK), model_version, denial_probability NUMBER(5,4), risk_factors VARIANT, predicted_at TIMESTAMP_NTZ

Stored Procedure: sp_update_high_risk_flag() — sets is_high_risk = TRUE where risk_score > 7.5
Task: task_daily_risk_scoring — daily at 06:00 UTC, calls sp_update_high_risk_flag()
Stream: stream_claims_cdc — CDC stream on CLAIMS

Reporting:
- V_HIGH_RISK_PATIENTS view: patients where is_high_risk = TRUE
- V_DENIAL_SUMMARY view: claim_status, denial_reason_code, COUNT(*)`

const SAMPLES = {
  'New Objects': { label: '🆕 New Objects', brd: SAMPLE_NEW,     badge: 'CREATE TABLE', badgeColor: '#1d4ed8', badgeBg: '#eff6ff' },
  'Enhancement': { label: '🔧 Enhancement', brd: SAMPLE_ENHANCE, badge: 'ALTER TABLE',  badgeColor: '#b45309', badgeBg: '#fffbeb' },
}

const PIPELINE_STEPS = [
  { key: 'input',   icon: '📄', label: 'BRD Input'        },
  { key: 'intent',  icon: '🧠', label: 'Intent Extraction' },
  { key: 'mapping', icon: '🗺️', label: 'Semantic Mapping'  },
  { key: 'explore', icon: '📊', label: 'Explore'           },
  { key: 'ddl',     icon: '⚙️', label: 'DDL Generation'    },
]

export default function BrdAnalyzer({ state, update, apiKey, workflowHooks = {} }) {
  const [activeSample, setActiveSample] = useState(null)
  const [dragover,     setDragover]     = useState(false)
  const [rightTab,     setRightTab]     = useState('entities') // entities | sql
  const [openSections, setOpenSections] = useState({ Tables:true, Procedures:true, Relationships:true, Reporting:true })
  const fileRef = useRef()

  const { run, loading, progress, statusMsg, error } = usePipeline(state, update, apiKey, workflowHooks)

  // Determine pipeline step index (0-based)
  const stepIdx = !state.brdText.trim() ? -1
    : !state.intentResult  ? 0
    : !state.mappingResult ? 1
    : !state.ddlResult     ? 2
    : 4

  const loadSample = key => {
    setActiveSample(key)
    update({ brdText: SAMPLES[key].brd, intentResult: null, mappingResult: null, ddlResult: null, pipelineRan: false })
  }

  const handleFile = file => {
    if (!file) return
    const r = new FileReader()
    r.onload = ev => { update({ brdText: ev.target.result }); setActiveSample(null) }
    r.readAsText(file)
  }

  const downloadDdl = () => {
    if (!state.ddlResult) return
    const blob = new Blob([state.ddlResult], { type: 'text/plain' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `schema_${Date.now()}.sql` })
    a.click()
  }

  const exportJson = () => {
    const payload = { intent: state.intentResult, mapping: state.mappingResult, stats: state.stats, generated: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `schemapilot_${Date.now()}.json` })
    a.click()
  }

  const intent  = state.intentResult
  const mapping = state.mappingResult

  // Detected entity data for the right panel
  const allEntities  = intent?.entities || []
  const newTables    = mapping?.new_tables     || []
  const reusedTables = mapping?.reused_tables  || []
  const rels         = mapping?.relationships  || []
  const procs        = intent?.procedures_needed || []
  const tasks        = intent?.tasks_needed      || []
  const streams      = intent?.streams_needed    || []
  const reporting    = intent?.reporting_needs   || []

  const toggleSection = key => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  return (
    <>
      {/* ── Hero Banner ── */}
      <div className="hero-banner">
        <div style={{ position:'relative', zIndex:1 }}>
          <div className="hero-title">SchemaPilot AI</div>
          <div className="hero-sub">Automate BRD to Snowflake DDL generation</div>
        </div>

        {/* Pipeline step bar inside banner */}
        <div style={{ display:'flex', alignItems:'center', gap:0, background:'rgba(0,0,0,.15)', borderRadius:10, overflow:'hidden', marginTop:14, position:'relative', zIndex:1 }}>
          {PIPELINE_STEPS.map((s, i) => {
            const done   = i <= stepIdx
            const active = i === stepIdx + 1 || (stepIdx === 4 && i === 4)
            return (
              <div key={s.key} style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'9px 8px', fontSize:11.5, fontWeight: done||active ? 700 : 500,
                color: done ? 'rgba(255,255,255,.95)' : active ? '#fff' : 'rgba(255,255,255,.45)',
                background: done ? 'rgba(13,158,120,.35)' : 'transparent',
                borderRight: i<4 ? '1px solid rgba(255,255,255,.1)' : 'none',
                transition:'all .2s',
              }}>
                <span style={{ fontSize:12 }}>{done && i<4 ? '✓' : s.icon}</span>
                {s.label}
                {i < 4 && <span style={{ opacity:.4, marginLeft:2 }}>›</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Stat Row ── */}
      <div className="stat-row">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Tables Generated</div>
            <div className="stat-value">{state.stats?.tables || 0}</div>
            <div className={`stat-sub ${state.stats?.tables > 0 ? 'positive' : ''}`}>
              {state.stats?.tables > 0 ? 'Generated today' : 'Run pipeline to generate'}
            </div>
          </div>
          <div className="stat-icon blue">🗄️</div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Assessments</div>
            <div className="stat-value">{state.auditLogs?.length || 0}</div>
            <div className="stat-sub">{state.auditLogs?.length > 0 ? 'This week' : 'No runs yet'}</div>
          </div>
          <div className="stat-icon green">⚡</div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Relationships Mapped</div>
            <div className="stat-value">{state.stats?.relations || 0}</div>
            <div className={`stat-sub ${state.stats?.relations > 0 ? 'positive' : ''}`}>
              {state.stats?.relations > 0 ? 'Total identified' : 'Awaiting analysis'}
            </div>
          </div>
          <div className="stat-icon orange">🔗</div>
        </div>

        {/* Export as JSON */}
        <div className="export-btn-wrap">
          <button className="btn btn-outline-teal" onClick={exportJson} disabled={!state.pipelineRan}
            style={{ fontSize:13, padding:'9px 16px' }}>
            ⬇ Export as JSON
          </button>
        </div>
      </div>

      {/* ── Main two-col grid ── */}
      <div className="brd-grid">

        {/* ═══ LEFT — Upload + BRD Input ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Upload panel */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span style={{ fontSize:16, color:'var(--teal)' }}>+</span> Upload BRD
              </div>
              {/* Sample selector */}
              <div style={{ display:'flex', gap:6 }}>
                {Object.entries(SAMPLES).map(([key, s]) => (
                  <button key={key} onClick={() => loadSample(key)} style={{
                    padding:'4px 10px', borderRadius:20, fontSize:11.5, fontWeight:700,
                    border:`1.5px solid ${activeSample===key ? s.badgeColor : 'var(--border)'}`,
                    background: activeSample===key ? s.badgeBg : 'var(--bg-light)',
                    color: activeSample===key ? s.badgeColor : 'var(--text-muted)',
                    cursor:'pointer', transition:'all .15s',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ padding:16 }}>
              {/* Drag & drop zone */}
              <div
                className={`drop-zone${dragover ? ' dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragover(true) }}
                onDragLeave={() => setDragover(false)}
                onDrop={e => { e.preventDefault(); setDragover(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                style={{ marginBottom:12 }}
              >
                <input ref={fileRef} type="file" accept=".txt,.md" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div className="drop-zone-icon">📤</div>
                <div className="drop-zone-text">
                  Drag & drop file here, or <span className="drop-zone-link">browse</span>
                </div>
                <div className="drop-zone-hint">.txt or .md files supported</div>
              </div>

              {/* Paste area */}
              <div style={{ marginBottom:10 }}>
                <div className="label" style={{ marginBottom:6 }}>or paste BRD content</div>
                <textarea
                  className="textarea"
                  value={state.brdText}
                  onChange={e => { update({ brdText: e.target.value }); setActiveSample(null) }}
                  style={{ minHeight:160, fontSize:12 }}
                  placeholder="— Objectives…&#10;— Entities…&#10;— Business Rules…&#10;— Reporting needs…"
                />
              </div>

              {/* Run button */}
              <button
                className="btn btn-primary btn-full"
                onClick={() => run(state.brdText)}
                disabled={loading || !state.brdText.trim()}
                style={{ fontSize:14, padding:'12px 20px' }}
              >
                {loading
                  ? <><span className="spinner" /> Processing…</>
                  : '⚡ Run AI Pipeline'}
              </button>

              {loading && (
                <div style={{ marginTop:10 }}>
                  <ProgressBar pct={progress} />
                  <div className="status-msg">{statusMsg}</div>
                </div>
              )}
              {!loading && statusMsg && (
                <div className="status-msg" style={{ color:'var(--teal)', marginTop:8 }}>{statusMsg}</div>
              )}
              {error && <Alert type="error">{error}</Alert>}

              {state.pipelineRan && (
                <div className="metrics-row" style={{ marginTop:14 }}>
                  <MetricCard label="Tables" value={state.stats?.tables || 0} />
                  <MetricCard label="Relations" value={state.stats?.relations || 0} />
                  <MetricCard label="Saved" value="~3wk" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT — Detected Entities + SQL Preview ═══ */}
        <div className="panel" style={{ minHeight:400 }}>
          {!state.pipelineRan ? (
            /* Empty state */
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 30px', textAlign:'center', gap:10 }}>
              <div style={{ fontSize:48, opacity:.1 }}>⚡</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-muted)' }}>Ready to analyse your BRD</div>
              <div style={{ fontSize:13, color:'var(--text-light)', maxWidth:300, lineHeight:1.8 }}>
                Upload or paste a BRD then click <strong style={{ color:'var(--teal)' }}>⚡ Run AI Pipeline</strong>
              </div>
            </div>
          ) : (
            <div className="fade-up">
              {/* Right panel tabs */}
              <div style={{ padding:'14px 20px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', gap:0 }}>
                  {[['entities','🔍 Detected Entities'],['sql','⚙️ Generated SQL (Preview)']].map(([k,label]) => (
                    <button key={k} onClick={()=>setRightTab(k)} style={{
                      padding:'9px 18px', border:'none', background:'transparent', cursor:'pointer',
                      fontSize:13, fontWeight: rightTab===k ? 700 : 500,
                      color: rightTab===k ? 'var(--teal)' : 'var(--text-muted)',
                      borderBottom:`2px solid ${rightTab===k ? 'var(--teal)' : 'transparent'}`,
                      fontFamily:'var(--font)', transition:'all .15s', marginBottom:-1,
                    }}>{label}</button>
                  ))}
                </div>
                {/* BRD type badge */}
                {intent?.brd_type && (
                  <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                    background: intent.brd_type==='ENHANCEMENT' ? '#fffbeb' : '#eff6ff',
                    color:      intent.brd_type==='ENHANCEMENT' ? '#b45309'  : '#1d4ed8',
                    border:`1px solid ${intent.brd_type==='ENHANCEMENT' ? '#fde68a' : '#bfdbfe'}`,
                  }}>
                    {intent.brd_type==='ENHANCEMENT' ? '🔧 Enhancement' : '🆕 New Build'}
                  </span>
                )}
              </div>

              {/* ── ENTITIES TAB ── */}
              {rightTab === 'entities' && (
                <div>
                  {/* Tables section */}
                  <div className="entity-section">
                    <div className="entity-section-header" onClick={()=>toggleSection('Tables')}>
                      <div className="entity-section-title">
                        <span style={{ fontSize:16 }}>🗄️</span> Tables
                        <span style={{ fontSize:11.5, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'var(--teal-light)', color:'var(--teal-dark)' }}>
                          {allEntities.length} identified
                        </span>
                      </div>
                      <span style={{ color:'var(--text-light)', fontSize:18, transform: openSections.Tables?'rotate(90deg)':'', transition:'transform .2s' }}>›</span>
                    </div>
                    {openSections.Tables && (
                      <div className="entity-section-body">
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                          {/* Reused (ALTER) */}
                          {reusedTables.map((t,i) => (
                            <span key={i} className="entity-chip alter" title={`ALTER TABLE — ${t.reason}`}>
                              🔧 {t.table_name}
                              <span style={{ fontSize:9, marginLeft:4, background:'#fde68a', padding:'1px 5px', borderRadius:8, color:'#92400e' }}>ALTER</span>
                            </span>
                          ))}
                          {/* New (CREATE) */}
                          {newTables.map((t,i) => (
                            <span key={i} className="entity-chip new" title={t.purpose}>
                              🆕 {t.table_name}
                            </span>
                          ))}
                          {/* Raw entities if no mapping yet */}
                          {newTables.length===0 && reusedTables.length===0 && allEntities.map((e,i) => (
                            <span key={i} className="entity-chip">{e.name}</span>
                          ))}
                        </div>

                        {/* Relationships mini-list */}
                        {rels.length > 0 && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:0.8, textTransform:'uppercase', marginBottom:6 }}>Relationships ({rels.length})</div>
                            {rels.slice(0,4).map((rel,i)=>(
                              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--bg-light)', borderRadius:7, marginBottom:4, border:'1px solid var(--border)', borderLeft:'3px solid var(--teal)' }}>
                                <span style={{ fontFamily:'var(--mono)', fontSize:11.5, fontWeight:700, color:'var(--jade-navy)' }}>{rel.from_table}</span>
                                <span style={{ color:'var(--teal)', fontWeight:700 }}>→</span>
                                <span style={{ fontFamily:'var(--mono)', fontSize:11.5, fontWeight:700, color:'var(--jade-navy)' }}>{rel.to_table}</span>
                                <span style={{ marginLeft:'auto', fontSize:10.5, padding:'2px 7px', borderRadius:10, background:'var(--teal-light)', color:'var(--teal-dark)', fontWeight:600 }}>{rel.type}</span>
                              </div>
                            ))}
                            {rels.length>4 && <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 10px' }}>+{rels.length-4} more…</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Procedures / Tasks / Streams */}
                  {(procs.length>0 || tasks.length>0 || streams.length>0) && (
                    <div className="entity-section">
                      <div className="entity-section-header" onClick={()=>toggleSection('Procedures')}>
                        <div className="entity-section-title"><span>⚙️</span> Snowflake Objects</div>
                        <span style={{ color:'var(--text-light)', fontSize:18, transform:openSections.Procedures?'rotate(90deg)':'', transition:'transform .2s' }}>›</span>
                      </div>
                      {openSections.Procedures && (
                        <div className="entity-section-body">
                          {procs.map((p,i)=>(
                            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 12px', background:'var(--purple-light)', border:'1px solid rgba(139,92,246,.2)', borderRadius:8, marginBottom:5 }}>
                              <span>⚙️</span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#5b21b6', fontWeight:700, flexShrink:0 }}>PROC</span>
                              <span style={{ fontSize:12.5 }}>{p}</span>
                            </div>
                          ))}
                          {tasks.map((t,i)=>(
                            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 12px', background:'var(--teal-light)', border:'1px solid rgba(13,158,120,.2)', borderRadius:8, marginBottom:5 }}>
                              <span>⏰</span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--teal-dark)', fontWeight:700, flexShrink:0 }}>TASK</span>
                              <span style={{ fontSize:12.5 }}>{t}</span>
                            </div>
                          ))}
                          {streams.map((s,i)=>(
                            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 12px', background:'var(--blue-light)', border:'1px solid rgba(59,130,246,.2)', borderRadius:8, marginBottom:5 }}>
                              <span>🌊</span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#1d4ed8', fontWeight:700, flexShrink:0 }}>STREAM</span>
                              <span style={{ fontSize:12.5 }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reporting */}
                  {reporting.length>0 && (
                    <div className="entity-section">
                      <div className="entity-section-header" onClick={()=>toggleSection('Reporting')}>
                        <div className="entity-section-title"><span>📊</span> Reporting ({reporting.length})</div>
                        <span style={{ color:'var(--text-light)', fontSize:18, transform:openSections.Reporting?'rotate(90deg)':'', transition:'transform .2s' }}>›</span>
                      </div>
                      {openSections.Reporting && (
                        <div className="entity-section-body">
                          {reporting.map((r,i)=>(
                            <div key={i} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                              <span style={{ color:'var(--teal)', fontWeight:700, flexShrink:0 }}>▸</span><span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── SQL PREVIEW TAB ── */}
              {rightTab === 'sql' && (
                <div style={{ padding:18 }}>
                  {/* Object type chips */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                    {/ALTER\s+TABLE/i.test(state.ddlResult||'')   && <span className="tag tag-amber">ALTER TABLE</span>}
                    {/CREATE\s+(?:OR\s+REPLACE\s+)?TABLE/i.test(state.ddlResult||'') && <span className="tag tag-blue">CREATE TABLE</span>}
                    {/CREATE\s+OR\s+REPLACE\s+VIEW/i.test(state.ddlResult||'')       && <span className="tag tag-teal">VIEWS</span>}
                    {/CREATE\s+OR\s+REPLACE\s+PROCEDURE/i.test(state.ddlResult||'')  && <span className="tag tag-purple">PROCEDURES</span>}
                    {/CREATE\s+OR\s+REPLACE\s+TASK/i.test(state.ddlResult||'')       && <span className="tag tag-green">TASKS</span>}
                    {/CREATE\s+OR\s+REPLACE\s+STREAM/i.test(state.ddlResult||'')     && <span className="tag tag-navy">STREAMS</span>}
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span className="label" style={{ marginBottom:0 }}>Generated Snowflake SQL</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}
                        onClick={()=>navigator.clipboard?.writeText(state.ddlResult)}>⎘ Copy</button>
                      <button className="btn btn-teal-light" style={{ padding:'6px 12px', fontSize:12 }} onClick={downloadDdl}>⬇ .sql</button>
                    </div>
                  </div>
                  <SqlCode code={state.ddlResult} />
                  <div className="deploy-banner">
                    <span>✓</span><strong>Ready for Snowflake Deployment</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
