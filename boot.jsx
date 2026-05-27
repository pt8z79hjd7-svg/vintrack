// === Bootstrap: התחברות → טעינת נתונים → רינדור ===
// עמיד לסדר-טעינה: ממתין שכל סקריפט (sb / Login / loadAllData / App) ייטען,
// כדי שלא ייכשל ברשת איטית (טלפון/מנהרה) שבה הקבצים מגיעים בקצב שונה.

async function waitFor(name, ms = 20000) {
  const t0 = Date.now();
  while (typeof window[name] === 'undefined') {
    if (Date.now() - t0 > ms) throw new Error('טעינה איטית — רענן את הדף (' + name + ')');
    await new Promise((r) => setTimeout(r, 150));
  }
  return window[name];
}

async function start() {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  try {
    await waitFor('sb');
    const { data: { session } } = await window.sb.auth.getSession();

    if (!session) {
      const Login = await waitFor('Login');
      root.render(React.createElement(Login, { onLogin: start }));
      return;
    }

    root.render(React.createElement('div',
      { style: { padding: 40, textAlign: 'center', color: '#888', fontSize: 15 } },
      'טוען נתונים…'));

    await waitFor('loadAllData');
    await window.loadAllData();

    const App = await waitFor('App');
    root.render(React.createElement(App));

    // ─── בכניסה לאפליקציה: לבקש דוח טרי מהמחשב ───
    // ההורדה תרוץ ברקע (30-60 שניות). כשתסתיים — realtime יעדכן את התצוגה אוטומטית.
    setTimeout(() => {
      if (window.requestFreshSync) window.requestFreshSync('app-open');
    }, 1500);
  } catch (e) {
    root.render(React.createElement('div',
      { style: { padding: 40, color: '#c0392b', fontSize: 15, lineHeight: 1.6 } },
      'שגיאה: ' + (e && e.message || e)));
  }
}

start();
