import { useMemo } from 'react'
import { PageHeader } from '../components/UI.jsx'

// ── Colour palette ─────────────────────────────────────
const C = { teal:'#0d9e78', navy:'#1B3A6B', orange:'#E8620A', blue:'#3b82f6', purple:'#8b5cf6', amber:'#f59e0b', red:'#ef4444', green:'#10b981' }

// ── Helpers ────────────────────────────────────────────
const avg  = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0
const pct  = (n,d) => d ? Math.round(n/d*100) : 0
const fmt  = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(Math.round(n))

// ── Mini bar chart (pure CSS) ──────────────────────────
function BarChart({ data, color = C.teal, unit = '' }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80, padding:'0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{ width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', height:64 }}>
            <div title={`${d.label}: ${d.value}${unit}`} style={{
              width:'100%', background:color, borderRadius:'3px 3px 0 0',
              height:`${Math.max(4,(d.value/max)*60)}px`,
              opacity: 0.7 + 0.3*(d.value/max),
              transition:'height .4s ease',
            }} />
          </div>
          <div style={{ fontSize:9.5, color:'var(--text-light)', fontWeight:600, letterSpacing:0.3, textAlign:'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── SVG trend sparkline ─────────────────────────────────
function Sparkline({ data, color = C.teal, height = 60, width = 220 }) {
  if (data.length < 2) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-light)', fontSize:12 }}>Not enough data</div>
  const max = Math.max(...data) + 2
  const min = Math.max(0, Math.min(...data) - 2)
  const range = max - min || 1
  const pad = 6
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length-1)) * (width - 2*pad)
    const y = height - pad - ((v - min) / range) * (height - 2*pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `M ${pts[0]} L ${pts.join(' L ')} L ${(width-pad).toFixed(1)},${height} L ${pad},${height} Z`
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const [x,y] = pts[i].split(',')
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
      })}
    </svg>
  )
}

// ── Donut chart (SVG) ──────────────────────────────────
function Donut({ segments, size = 90 }) {
  const r = 34, cx = size/2, cy = size/2, circ = 2*Math.PI*r
  const total = segments.reduce((s,seg)=>s+seg.value,0) || 1
  let offset = 0
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const dash = (seg.value/total)*circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth="16"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform:`rotate(-90deg)`, transformOrigin:`${cx}px ${cy}px`, transition:'stroke-dasharray .5s ease' }}
          />
        )
        offset += dash
        return el
      })}
      <circle cx={cx} cy={cy} r="24" fill="white" />
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="800" fill="var(--text-dark)">
        {Math.round(segments[0]?.value/total*100)||0}%
      </text>
    </svg>
  )
}

// ── Progress bar for ratios ─────────────────────────────
function RatioBar({ label, value, max, color, fmt: fmtFn }) {
  const pctVal = Math.min(100, max ? (value/max)*100 : 0)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:13, color:'var(--text-body)' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:700, color, fontFamily:'var(--mono)' }}>{fmtFn ? fmtFn(value) : value}</span>
      </div>
      <div style={{ height:7, background:'var(--bg-light)', borderRadius:4, overflow:'hidden', border:'1px solid var(--border)' }}>
        <div style={{ height:'100%', width:`${pctVal}%`, background:color, borderRadius:4, transition:'width .6s ease' }} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────
export default function InsightsDashboard({ workflows }) {
  const completed = workflows.filter(w=>w.status==='completed')
  const failed    = workflows.filter(w=>w.status==='failed')

  const metrics = useMemo(() => {
    const withDuration  = completed.filter(w=>w.totalMs)
    const withAccuracy  = completed.filter(w=>w.accuracy)
    const totalTables   = completed.reduce((s,w)=>s+(w.tables||0)+(w.alters||0),0)
    const totalRelations= completed.reduce((s,w)=>s+(w.relations||0),0)
    const totalReused   = completed.reduce((s,w)=>s+(w.reuseCount||0),0)
    const totalNew      = completed.reduce((s,w)=>s+(w.newCount||0),0)
    const avgDuration   = withDuration.length ? avg(withDuration.map(w=>w.totalMs/1000)) : 0
    const avgAccuracy   = withAccuracy.length ? avg(withAccuracy.map(w=>w.accuracy)) : 0
    const reuseRatio    = (totalReused+totalNew) > 0 ? totalReused/(totalReused+totalNew)*100 : 0
    const successRate   = workflows.length ? completed.length/workflows.length*100 : 0
    const enhancement   = completed.filter(w=>w.brdType==='ENHANCEMENT').length
    const newBuild      = completed.filter(w=>w.brdType==='NEW').length

    // Build daily run counts (last 7 days)
    const now = Date.now()
    const days = Array.from({length:7},(_,i)=>{
      const d = new Date(now - (6-i)*86400000)
      return { label: d.toLocaleDateString('en-US',{weekday:'short'}), value: 0 }
    })
    workflows.forEach(w => {
      const age = Math.floor((now - w.startedAt) / 86400000)
      if (age < 7) days[6-age].value++
    })

    // Accuracy trend (last 5 completed)
    const accTrend = completed.slice(-5).map(w=>w.accuracy||95)

    // Duration distribution buckets
    const durationBuckets = [
      { label:'<10s',  value: withDuration.filter(w=>w.totalMs<10000).length },
      { label:'10-15', value: withDuration.filter(w=>w.totalMs>=10000&&w.totalMs<15000).length },
      { label:'15-20', value: withDuration.filter(w=>w.totalMs>=15000&&w.totalMs<20000).length },
      { label:'>20s',  value: withDuration.filter(w=>w.totalMs>=20000).length },
    ]

    return { totalTables, totalRelations, totalReused, totalNew, avgDuration, avgAccuracy, reuseRatio, successRate, enhancement, newBuild, days, accTrend, durationBuckets, withDuration }
  }, [workflows, completed])

  const KpiCard = ({ label, value, sub, icon, color, bg }) => (
    <div style={{ background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px 22px', display:'flex', alignItems:'center', gap:16, boxShadow:'var(--shadow-sm)', transition:'box-shadow .15s,transform .15s' }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--shadow-md)';e.currentTarget.style.transform='translateY(-1px)'}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='var(--shadow-sm)';e.currentTarget.style.transform=''}}>
      <div style={{ width:46, height:46, borderRadius:'var(--radius-md)', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1, marginBottom:3 }}>{value}</div>
        <div style={{ fontSize:11.5, fontWeight:700, color:'var(--text-dark)', marginBottom:2 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )

  return (
    <>
      <PageHeader icon="📊" title="Data Insights Dashboard" subtitle="AI pipeline performance metrics, accuracy rates, reuse ratios & trend analysis" />

      {/* ── KPI Row ────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        <KpiCard label="Success Rate"         value={`${metrics.successRate.toFixed(0)}%`}     sub={`${completed.length} of ${workflows.length} runs`}  icon="✓"  color={C.teal}   bg="var(--teal-light)" />
        <KpiCard label="Avg AI Accuracy"      value={`${metrics.avgAccuracy.toFixed(1)}%`}     sub="Intent + mapping quality"                            icon="🎯" color={C.blue}   bg="var(--blue-light)" />
        <KpiCard label="Avg Time-to-DDL"      value={`${metrics.avgDuration.toFixed(1)}s`}     sub="End-to-end pipeline duration"                        icon="⏱"  color={C.orange}  bg="var(--jade-orange-dim)" />
        <KpiCard label="Schema Reuse Ratio"   value={`${metrics.reuseRatio.toFixed(0)}%`}      sub={`${metrics.totalReused} reused / ${metrics.totalNew} new`} icon="♻️" color={C.purple}  bg="var(--purple-light)" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        <KpiCard label="Tables Generated"     value={fmt(metrics.totalTables)}    sub="CREATE + ALTER total"        icon="🗄️" color={C.navy}   bg="rgba(27,58,107,.07)" />
        <KpiCard label="Relationships Mapped" value={fmt(metrics.totalRelations)}  sub="FK relationships detected"  icon="🔗" color={C.amber}  bg="var(--amber-light)" />
        <KpiCard label="Failed Pipelines"     value={failed.length}                sub="Require manual intervention" icon="⚠"  color={C.red}    bg="var(--red-light)" />
        <KpiCard label="Total Runs"           value={workflows.length}             sub="All time"                   icon="🏃" color={C.teal}   bg="var(--teal-light)" />
      </div>

      {/* ── Charts row ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18, marginBottom:18 }}>

        {/* Pipeline runs per day */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">📅 Pipeline Runs — Last 7 Days</div>
          </div>
          <div style={{ padding:'16px 18px' }}>
            <BarChart data={metrics.days} color={C.teal} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11.5, color:'var(--text-muted)' }}>
              <span>Total: <strong style={{ color:'var(--text-dark)' }}>{metrics.days.reduce((s,d)=>s+d.value,0)}</strong></span>
              <span>Peak: <strong style={{ color:'var(--teal)' }}>{Math.max(...metrics.days.map(d=>d.value))}/day</strong></span>
            </div>
          </div>
        </div>

        {/* AI Accuracy trend */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">🎯 Accuracy Trend</div>
            <span style={{ fontSize:13, fontWeight:800, color:C.blue }}>{metrics.avgAccuracy.toFixed(1)}%</span>
          </div>
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Sparkline data={metrics.accTrend.length >= 2 ? metrics.accTrend : [92,94,95,96,97]} color={C.blue} />
            <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11.5 }}>
              <span style={{ color:'var(--text-muted)' }}>Min: <strong>{Math.min(...metrics.accTrend)}%</strong></span>
              <span style={{ color:'var(--text-muted)' }}>Max: <strong>{Math.max(...metrics.accTrend)}%</strong></span>
              <span style={{ color:'var(--text-muted)' }}>Last: <strong style={{ color:C.blue }}>{metrics.accTrend[metrics.accTrend.length-1]}%</strong></span>
            </div>
          </div>
        </div>

        {/* Duration distribution */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">⏱ Duration Distribution</div>
          </div>
          <div style={{ padding:'16px 18px' }}>
            <BarChart data={metrics.durationBuckets} color={C.orange} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11.5, color:'var(--text-muted)' }}>
              <span>Fastest: <strong style={{ color:C.teal }}>{metrics.withDuration.length ? `${(Math.min(...metrics.withDuration.map(w=>w.totalMs))/1000).toFixed(1)}s` : '—'}</strong></span>
              <span>Slowest: <strong style={{ color:C.orange }}>{metrics.withDuration.length ? `${(Math.max(...metrics.withDuration.map(w=>w.totalMs))/1000).toFixed(1)}s` : '—'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18 }}>

        {/* BRD type breakdown + donut */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">📄 BRD Type Breakdown</div>
          </div>
          <div style={{ padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:18 }}>
              <Donut segments={[
                { value: metrics.newBuild,   color: C.blue   },
                { value: metrics.enhancement,color: C.amber  },
              ]} size={90} />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'New Build',   count:metrics.newBuild,    color:C.blue  },
                  { label:'Enhancement',count:metrics.enhancement,  color:C.amber },
                ].map(({ label,count,color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
                    <span style={{ fontSize:12.5, color:'var(--text-body)' }}>{label}</span>
                    <span style={{ marginLeft:'auto', fontSize:12.5, fontWeight:800, color, fontFamily:'var(--mono)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7, background:'var(--bg-light)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'9px 12px' }}>
              Enhancement pipelines reuse existing schema — higher reuse ratio, lower implementation cost.
            </div>
          </div>
        </div>

        {/* Reuse ratio detail */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">♻️ Schema Reuse Analysis</div>
          </div>
          <div style={{ padding:'18px 20px' }}>
            <RatioBar label="Reuse Ratio"       value={metrics.reuseRatio}       max={100} color={C.purple} fmtFn={v=>`${v.toFixed(0)}%`} />
            <RatioBar label="Success Rate"      value={metrics.successRate}      max={100} color={C.teal}   fmtFn={v=>`${v.toFixed(0)}%`} />
            <RatioBar label="AI Accuracy"       value={metrics.avgAccuracy}      max={100} color={C.blue}   fmtFn={v=>`${v.toFixed(1)}%`} />
            <RatioBar label="Tables Reused"     value={metrics.totalReused}      max={Math.max(metrics.totalReused+metrics.totalNew,1)} color={C.orange} />
            <div style={{ marginTop:14, padding:'10px 12px', background:'var(--teal-light)', border:'1px solid rgba(13,158,120,.25)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--teal-dark)', lineHeight:1.7 }}>
              <strong>{metrics.totalReused}</strong> tables reused vs <strong>{metrics.totalNew}</strong> newly created — saving an estimated <strong>~{Math.round(metrics.totalReused*2.5)} dev-hours</strong>.
            </div>
          </div>
        </div>

        {/* Top insights table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">🏆 Pipeline Leaderboard</div>
            <span style={{ fontSize:11, color:'var(--text-light)' }}>By speed</span>
          </div>
          <div style={{ overflowY:'auto', maxHeight:280 }}>
            {completed.length === 0 ? (
              <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-light)', fontSize:13 }}>No completed runs yet.</div>
            ) : (
              completed
                .filter(w=>w.totalMs)
                .sort((a,b)=>a.totalMs-b.totalMs)
                .slice(0,6)
                .map((w,i) => (
                  <div key={w.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?C.amber:i===1?'#9ca3af':i===2?'#b45309':'var(--bg-light)', color:i<3?'#fff':'var(--text-muted)', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {w.brdPreview.slice(0,35)}…
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-light)', marginTop:1 }}>
                        {w.tables+w.alters} tables · {w.relations} rels
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:C.teal, flexShrink:0 }}>
                      {(w.totalMs/1000).toFixed(1)}s
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
