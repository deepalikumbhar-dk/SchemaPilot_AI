import { useState } from 'react'
import { PageHeader, Alert } from '../components/UI.jsx'

const STATUS_META = {
  completed: { label:'Completed', color:'#065f46', bg:'#d1fae5', border:'rgba(16,185,129,.25)', dot:'#10b981', icon:'✓' },
  running:   { label:'Running',   color:'#1d4ed8', bg:'#dbeafe', border:'rgba(59,130,246,.25)',  dot:'#3b82f6', icon:'⟳' },
  failed:    { label:'Failed',    color:'#991b1b', bg:'#fee2e2', border:'rgba(239,68,68,.25)',   dot:'#ef4444', icon:'✗' },
  pending:   { label:'Pending',   color:'#92400e', bg:'#fef3c7', border:'rgba(245,158,11,.25)', dot:'#f59e0b', icon:'◷' },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, fontSize:11.5, fontWeight:700, background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:m.dot, display:'inline-block',
        ...(status==='running' ? { animation:'pulse 1.2s infinite' } : {}) }} />
      {m.label}
    </span>
  )
}

function StepTimeline({ steps }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {steps.map((step, i) => {
        const m = STATUS_META[step.status] || STATUS_META.pending
        return (
          <div key={step.key} style={{ display:'flex', gap:0, alignItems:'stretch' }}>
            {/* Connector column */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:28, flexShrink:0 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:m.bg, border:`2px solid ${m.dot}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:m.color, flexShrink:0, zIndex:1 }}>
                {step.status==='done'?'✓':step.status==='failed'?'✗':step.status==='running'?'…':String(i+1)}
              </div>
              {i < steps.length-1 && <div style={{ width:2, flex:1, background: step.status==='done'?'var(--teal)':'var(--border)', minHeight:20 }} />}
            </div>

            {/* Content */}
            <div style={{ paddingLeft:12, paddingBottom:i<steps.length-1?16:0, paddingTop:2, flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-dark)' }}>{step.icon} {step.label}</span>
                <StatusBadge status={step.status==='done'?'completed':step.status} />
                {step.durationMs && (
                  <span style={{ fontSize:11.5, color:'var(--text-light)', fontFamily:'var(--mono)' }}>
                    {step.durationMs >= 1000 ? `${(step.durationMs/1000).toFixed(1)}s` : `${step.durationMs}ms`}
                  </span>
                )}
              </div>
              {step.status==='failed' && step.error && (
                <div style={{ fontSize:12, color:'#991b1b', background:'#fee2e2', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, padding:'6px 10px', marginTop:4, fontFamily:'var(--mono)' }}>
                  ✗ {step.error}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WorkflowRow({ wf, expanded, onToggle, onRerun }) {
  const m = STATUS_META[wf.status] || STATUS_META.pending
  const durationSec = wf.totalMs ? (wf.totalMs / 1000).toFixed(1) : null

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:10, boxShadow:'var(--shadow-sm)', transition:'box-shadow .15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow-sm)'}>

      {/* Row header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'var(--bg-white)', cursor:'pointer' }} onClick={onToggle}>
        {/* Status indicator stripe */}
        <div style={{ width:4, height:42, borderRadius:3, background:m.dot, flexShrink:0 }} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-light)', background:'var(--bg-light)', padding:'2px 7px', borderRadius:6, border:'1px solid var(--border)', flexShrink:0 }}>{wf.id}</span>
            <StatusBadge status={wf.status} />
            <span style={{ fontSize:11, padding:'3px 9px', borderRadius:12, fontWeight:700,
              background: wf.brdType==='ENHANCEMENT'?'#fffbeb':'#eff6ff',
              color: wf.brdType==='ENHANCEMENT'?'#b45309':'#1d4ed8',
              border: `1px solid ${wf.brdType==='ENHANCEMENT'?'#fde68a':'#bfdbfe'}`,
            }}>{wf.brdType==='ENHANCEMENT'?'🔧 Enhancement':'🆕 New Build'}</span>
          </div>
          <div style={{ fontSize:13, color:'var(--text-body)', lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:420 }}>
            {wf.brdPreview}
          </div>
        </div>

        {/* Metrics strip */}
        <div style={{ display:'flex', gap:16, flexShrink:0 }}>
          {[
            { label:'Tables',    value: wf.tables + wf.alters },
            { label:'Relations', value: wf.relations },
            { label:'Duration',  value: durationSec ? `${durationSec}s` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text-dark)', lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10, color:'var(--text-light)', fontWeight:600, letterSpacing:0.5, textTransform:'uppercase', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Started at */}
        <div style={{ fontSize:11.5, color:'var(--text-light)', fontFamily:'var(--mono)', textAlign:'right', flexShrink:0, minWidth:130 }}>
          {new Date(wf.startedAt).toLocaleString()}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, flexShrink:0 }} onClick={e => e.stopPropagation()}>
          {wf.status === 'failed' && (
            <button className="btn btn-orange" style={{ padding:'6px 14px', fontSize:12.5 }} onClick={() => onRerun(wf)}>
              ↺ Re-run
            </button>
          )}
          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-light)', fontSize:18, padding:'0 4px', transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--teal)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text-light)'}
            onClick={onToggle}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'18px 24px', background:'var(--bg-light)', borderTop:'1px solid var(--border)' }} className="fade-up">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* Step timeline */}
            <div>
              <div className="label" style={{ marginBottom:12 }}>Step Timeline</div>
              <StepTimeline steps={wf.steps || []} />
            </div>

            {/* Metadata */}
            <div>
              <div className="label" style={{ marginBottom:12 }}>Workflow Details</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  ['Workflow ID',       wf.id],
                  ['BRD Type',         wf.brdType],
                  ['Total Duration',   durationSec ? `${durationSec}s` : 'N/A'],
                  ['Tables Created',   wf.tables],
                  ['Tables Altered',   wf.alters],
                  ['FK Relationships', wf.relations],
                  ['Reused Tables',    wf.reuseCount ?? '—'],
                  ['New Tables',       wf.newCount ?? '—'],
                  ['AI Accuracy',      wf.accuracy ? `${wf.accuracy}%` : '—'],
                  ['Re-run Count',     wf.rerunCount ?? 0],
                  ['Status',           wf.status.toUpperCase()],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:700, color:'var(--text-dark)', fontFamily:'var(--mono)', fontSize:12 }}>{v}</span>
                  </div>
                ))}
              </div>

              {wf.status==='failed' && (
                <div style={{ marginTop:14 }}>
                  <Alert type="error">{wf.error}</Alert>
                  <button className="btn btn-orange btn-full" style={{ marginTop:10 }} onClick={() => onRerun(wf)}>
                    ↺ Re-run this Workflow
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowManager({ workflows, onRerun, onNavigate, notify }) {
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [sortBy,   setSortBy]   = useState('startedAt')

  const filtered = workflows
    .filter(w => filter==='all' || w.status===filter)
    .filter(w => !search || w.brdPreview.toLowerCase().includes(search.toLowerCase()) || w.id.includes(search))
    .sort((a,b) => sortBy==='startedAt' ? b.startedAt-a.startedAt : sortBy==='duration' ? (b.totalMs||0)-(a.totalMs||0) : 0)

  const counts = {
    all:       workflows.length,
    completed: workflows.filter(w=>w.status==='completed').length,
    running:   workflows.filter(w=>w.status==='running').length,
    failed:    workflows.filter(w=>w.status==='failed').length,
  }

  const avgDuration = workflows.filter(w=>w.totalMs).length
    ? (workflows.filter(w=>w.totalMs).reduce((s,w)=>s+w.totalMs,0) / workflows.filter(w=>w.totalMs).length / 1000).toFixed(1)
    : '—'

  const successRate = workflows.length
    ? Math.round(workflows.filter(w=>w.status==='completed').length / workflows.length * 100)
    : 0

  return (
    <>
      <PageHeader icon="⚡" title="Workflow Management" subtitle="Monitor BRD pipeline progress, re-run failures, and track all processing history" />

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:'Total Workflows', value:counts.all,       icon:'⚡', color:'var(--jade-navy)',   bg:'rgba(27,58,107,.07)' },
          { label:'Completed',       value:counts.completed, icon:'✓',  color:'var(--teal)',        bg:'var(--teal-light)' },
          { label:'Failed',          value:counts.failed,    icon:'✗',  color:'#ef4444',            bg:'var(--red-light)' },
          { label:'Avg Duration',    value:`${avgDuration}s`,icon:'⏱',  color:'var(--jade-orange)', bg:'var(--jade-orange-dim)' },
        ].map(({ label,value,icon,color,bg }) => (
          <div key={label} style={{ background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'var(--shadow-sm)' }}>
            <div style={{ width:40, height:40, borderRadius:'var(--radius-md)', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, color }}>{icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification hint if failed */}
      {counts.failed > 0 && (
        <div style={{ marginBottom:16 }}>
          <Alert type="warn">
            <strong>{counts.failed} workflow{counts.failed>1?'s':''} failed.</strong> Expand them below to view error details and use ↺ Re-run to retry.
          </Alert>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {/* Filter tabs */}
        <div style={{ display:'flex', background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden', flexShrink:0 }}>
          {Object.entries(counts).map(([k, count]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding:'8px 16px', border:'none', background: filter===k?'var(--teal)':'transparent',
              color: filter===k?'#fff':'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)',
              fontSize:12.5, fontWeight: filter===k?700:500, transition:'all .15s',
              display:'flex', alignItems:'center', gap:6,
            }}>
              {k.charAt(0).toUpperCase()+k.slice(1)}
              <span style={{ background: filter===k?'rgba(255,255,255,.25)':'var(--bg-light)', borderRadius:10, padding:'1px 7px', fontSize:11, fontWeight:700, color: filter===k?'#fff':'var(--text-muted)' }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex:1, position:'relative', minWidth:200 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'var(--text-light)' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by BRD content or workflow ID…"
            style={{ width:'100%', padding:'9px 14px 9px 36px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:13.5, color:'var(--text-body)', outline:'none', background:'var(--bg-white)', fontFamily:'var(--font)' }}
            onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(13,158,120,.1)'}}
            onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}
          />
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'9px 14px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:13, color:'var(--text-body)', background:'var(--bg-white)', outline:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
          <option value="startedAt">Sort: Newest First</option>
          <option value="duration">Sort: Longest Duration</option>
        </select>

        <button className="btn btn-primary" style={{ padding:'9px 18px', fontSize:13 }} onClick={() => onNavigate('BRD Analyzer')}>
          + New Pipeline
        </button>
      </div>

      {/* Workflow list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-light)', fontSize:14 }}>
          <div style={{ fontSize:40, opacity:.2, marginBottom:12 }}>⚡</div>
          No workflows match your filter.
        </div>
      ) : (
        filtered.map(wf => (
          <WorkflowRow
            key={wf.id}
            wf={wf}
            expanded={expanded===wf.id}
            onToggle={() => setExpanded(prev => prev===wf.id ? null : wf.id)}
            onRerun={onRerun}
          />
        ))
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </>
  )
}
