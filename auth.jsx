// === מסך התחברות (Supabase Auth) ===
function Login({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await window.sb.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setErr('התחברות נכשלה — בדוק אימייל/סיסמה');
    else onLogin();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, oklch(0.97 0.01 200), oklch(0.93 0.03 200))', padding: 20,
    }}>
      <form onSubmit={submit} style={{
        width: 360, maxWidth: '100%', background: '#fff', borderRadius: 18, padding: 32,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'oklch(0.42 0.10 200)' }}>VinTrack</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>יין וחברים · ניהול מלאי</div>
        </div>
        <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15 }} />
        <input type="password" placeholder="סיסמה" value={pw} onChange={(e) => setPw(e.target.value)} required
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15 }} />
        {err && <div style={{ color: '#c0392b', fontSize: 13, textAlign: 'center' }}>{err}</div>}
        <button type="submit" disabled={busy} style={{
          padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'oklch(0.52 0.09 200)', color: '#fff', fontSize: 15, fontWeight: 700,
          opacity: busy ? 0.6 : 1,
        }}>{busy ? 'מתחבר…' : 'כניסה'}</button>
      </form>
    </div>
  );
}
window.Login = Login;
