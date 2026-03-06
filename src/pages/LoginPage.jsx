import { useState } from 'react'

const DEMO_USERS = [
  { username: 'admin',   password: 'jade@2026', role: 'Administrator' },
  { username: 'analyst', password: 'jade@2026', role: 'Data Analyst'  },
]

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const user = DEMO_USERS.find(u => u.username === username && u.password === password)
    if (user) onLogin(user)
    else setError('Invalid credentials. Try admin / jade@2026')
    setLoading(false)
  }

  const inp = (val, setter) => ({
    style: {
      width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
      borderRadius: 9, fontSize: 14, color: '#1a2332', outline: 'none',
      background: '#f9fafb', fontFamily: 'var(--font)', transition: 'border-color .15s',
    },
    value: val, onChange: e => setter(e.target.value),
    onFocus: e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,158,120,.12)'; e.target.style.background = '#fff' },
    onBlur:  e => { e.target.style.borderColor = '#e5e7eb';     e.target.style.boxShadow = 'none';                            e.target.style.background = '#f9fafb' },
  })

  return (
    <div style={{
      minHeight: '100vh', fontFamily: 'var(--font)',
      background: 'linear-gradient(135deg, var(--jade-navy-deeper) 0%, #0d3d2e 50%, var(--teal-dark) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* BG circles */}
      {[['right:-80px','top:-80px',400,'rgba(13,158,120,.12)'],['left:-60px','bottom:-80px',340,'rgba(27,58,107,.25)']].map(([r,t,s,c],i)=>(
        <div key={i} style={{ position:'absolute', width:s, height:s, borderRadius:'50%', background:`radial-gradient(circle, ${c} 0%, transparent 70%)`, ...Object.fromEntries([r,t].map(v=>v.split(':'))), pointerEvents:'none' }} />
      ))}

      <div style={{ background:'#fff', borderRadius:20, padding:'42px 46px', width:'100%', maxWidth:430, boxShadow:'0 24px 80px rgba(0,0,0,.22)', position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="/jade-logo.png" alt="Jade Global" style={{ height:44, objectFit:'contain', display:'block', margin:'0 auto 14px' }} />
          <div style={{ fontSize:18, fontWeight:800, color:'var(--text-dark)', letterSpacing:'-0.3px' }}>
            Schema<span style={{ color:'var(--teal)' }}>Pilot</span> AI
          </div>
          <div style={{ fontSize:11.5, color:'#94a3b8', letterSpacing:'1.5px', textTransform:'uppercase', marginTop:3 }}>
            Snowflake DDL Generator
          </div>
        </div>

        <div style={{ borderTop:'1px solid #f1f5f9', marginBottom:24 }} />

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', letterSpacing:0.5, textTransform:'uppercase', marginBottom:7 }}>Username</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#9ca3af' }}>👤</span>
              <input type="text" {...inp(username, setUsername)} style={{ ...inp(username,setUsername).style, paddingLeft:38 }} placeholder="Enter username" required />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', letterSpacing:0.5, textTransform:'uppercase' }}>Password</label>
              <span style={{ fontSize:12, color:'var(--teal)', cursor:'pointer', fontWeight:600 }}>Forgot password?</span>
            </div>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#9ca3af' }}>🔒</span>
              <input type={showPass?'text':'password'} {...inp(password,setPassword)}
                style={{ ...inp(password,setPassword).style, paddingLeft:38, paddingRight:40 }}
                placeholder="Enter password" required />
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#9ca3af', padding:0 }}>
                {showPass?'🙈':'👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#991b1b', display:'flex', gap:8 }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'12px 20px',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, var(--jade-navy), var(--teal))',
            color:'#fff', border:'none', borderRadius:9, fontSize:15, fontWeight:700,
            cursor: loading?'not-allowed':'pointer', fontFamily:'var(--font)',
            boxShadow: loading?'none':'0 4px 18px rgba(13,158,120,.3)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:9, transition:'all .18s',
          }}>
            {loading ? <><span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .65s linear infinite' }} /> Signing in…</> : '→  Sign In'}
          </button>
        </form>

        <div style={{ marginTop:20, padding:'12px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:9, fontSize:12, color:'#64748b', lineHeight:1.9 }}>
          <strong style={{ color:'#374151' }}>Demo credentials</strong><br />
          Username: <code style={{ color:'var(--teal-dark)', background:'#e2e8f0', padding:'1px 5px', borderRadius:3 }}>admin</code>
          &nbsp; Password: <code style={{ color:'var(--teal-dark)', background:'#e2e8f0', padding:'1px 5px', borderRadius:3 }}>jade@2026</code>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11.5, color:'#9ca3af' }}>
          © 2026 Jade Global. All rights reserved.
        </div>
      </div>
    </div>
  )
}
