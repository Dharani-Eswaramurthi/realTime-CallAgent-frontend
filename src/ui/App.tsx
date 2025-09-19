import React, { useCallback, useEffect, useRef, useState } from 'react';

type Turn = { role: string; message: string };

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL as string;

export function App() {
  const [summary, setSummary] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 3;

  const dataCache = useRef<{ turns: Turn[]; summary: string | null }>({ turns: [], summary: null });

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = new Date().getTime();
      const resp = await fetch(`${BACKEND_BASE}/conversations/latest?t=${timestamp}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000)
      });

      if (!resp.ok) throw new Error(`Backend error ${resp.status}`);

      const data = await resp.json();

      const transcript: any[] = data?.transcript || [];
      const cleanTurns: Turn[] = Array.isArray(transcript)
        ? transcript
            .filter((t) => t && typeof t.role === 'string')
            .map((t) => ({ role: String(t.role), message: String(t.message ?? '') }))
        : [];

      const s = data?.summary ?? null;

      setTurns(cleanTurns);
      setSummary(typeof s === 'string' ? s : null);
      dataCache.current = { turns: cleanTurns, summary: typeof s === 'string' ? s : null };

      setRetryCount(0);
      setLastFetchTime(timestamp);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      setError(e instanceof Error ? e.message : 'Loading failed');
      setRetryCount((prev) => prev + 1);
      if (retryCount >= maxRetries) {
        setTurns(dataCache.current.turns);
        setSummary(dataCache.current.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchLatest();
    const interval = retryCount > 0 ? Math.min(10000 * Math.pow(1.5, retryCount), 30000) : 10000;
    const id = setInterval(fetchLatest, interval);
    return () => clearInterval(id);
  }, [fetchLatest, retryCount]);

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-badge">🎙️</div>
          <div>
            <h1 className="brand-title">Miraco AI Transcript Viewer</h1>
            <p className="brand-sub">Real-time conversation analytics</p>
          </div>
        </div>

        {/* Status Row */}
        <div className="status-row">
          <div className={`status-pill ${loading ? 'is-loading' : 'is-live'}`}>
            <span className="dot" />
            <span className="status-text">{loading ? 'Syncing…' : 'Live'}</span>
          </div>

          <div className="divider" />

          <span className="muted">Backend: {BACKEND_BASE}</span>

          {lastFetchTime > 0 && (
            <>
              <div className="divider" />
              <span className="muted">Last sync: {new Date(lastFetchTime).toLocaleTimeString()}</span>
            </>
          )}

          <button className="btn" onClick={fetchLatest} disabled={loading} title="Refresh">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="status success">
            {/* Using success styling as requested; could invert if you prefer red for error */}
            ✅ {error}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="layout">
        {/* Messages (left) */}
        <section className="messages">
          <div className="section-title">
            <div className="section-icon">💬</div>
            <h2>Live Transcript</h2>
            {turns.length > 0 && <div className="count-badge">{turns.length} message{turns.length !== 1 ? 's' : ''}</div>}
          </div>

          {turns.length === 0 ? (
            <div className="empty">
              <div className="empty-emoji">🎤</div>
              <h3>Waiting for conversation…</h3>
              <p>Conversation messages will appear here after a call ends</p>
            </div>
          ) : (
            <div className="chat-list">
              {turns.map((t, i) => {
                const isAssistant = t.role === 'agent' || t.role === 'assistant';
                return (
                  <div key={i} className={`chat-bubble ${isAssistant ? 'assistant' : 'user'}`} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="bubble-head">
                      <div className={`avatar ${isAssistant ? 'a' : 'u'}`}>{isAssistant ? <svg xmlns="http://www.w3.org/2000/svg" width="876" height="876" viewBox="0 0 876 876" fill="none">
<path d="M468 292H528V584H468V292Z" fill="black"/>
<path d="M348 292H408V584H348V292Z" fill="black"/>
</svg> : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>}</div>
                      <span className={`who ${isAssistant ? 'who-a' : 'who-u'}`}>{isAssistant ? 'Miraco AI Agent' : 'User'}</span>
                    </div>
                    <p className="bubble-text">{t.message || <em className="muted">(No message)</em>}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* File uploader (dashed drag-and-drop area) */}
          <div className="uploader" role="region" aria-label="Upload area">
            <span className="uploader-title">Upload audio or text</span>
            <span className="uploader-sub">Drag & drop files here, or click to browse</span>
          </div>
        </section>

        {/* Sidebar (right, fixed 300px with overflow) */}
        <aside className="sidebar">
          <div className="section-title">
            <div className="section-icon alt"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M320-600q17 0 28.5-11.5T360-640q0-17-11.5-28.5T320-680q-17 0-28.5 11.5T280-640q0 17 11.5 28.5T320-600Zm0 160q17 0 28.5-11.5T360-480q0-17-11.5-28.5T320-520q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440Zm0 160q17 0 28.5-11.5T360-320q0-17-11.5-28.5T320-360q-17 0-28.5 11.5T280-320q0 17 11.5 28.5T320-280ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm0-560v160-160 560-560Z"/></svg></div>
            <h2>AI Summary</h2>
          </div>

          {summary ? (
            <div className="summary-card">
              <div className="chip">Auto-generated</div>
              <p className="summary-text">{summary}</p>
            </div>
          ) : (
            <div className="empty alt">
              <div className="empty-emoji">📝</div>
              <h3>No summary yet</h3>
              <p>AI summary will appear after call analysis</p>
            </div>
          )}
        </aside>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
         Auto-refreshes every 10 seconds • Connected to ElevenLabs webhooks • Real-time transcript processing
        </p>
      </footer>

      {/* THEME CSS */}
      <style>{`
        :root{
          --bg:#f1f3f5;
          --text:#212529;
          --muted:#6c757d;
          --white:#ffffff;
          --user-bg:#f8f9fa;
          --assistant-bg:#ffffff;
          --assistant-shadow:0 1px 3px rgba(0,0,0,0.1);
          --user-border:#6c757d;
          --assistant-border:#28a745;
          --green:#28a745;
          --green-100:#e6f4ea;
          --border:#dee2e6;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}

        .app-root{min-height:100vh;display:flex;flex-direction:column}

        /* Header */
        .app-header{
          background:var(--white);
          border-bottom:1px solid var(--border);
          padding:16px 20px;
          position:sticky;top:0;z-index:10;
        }
        .brand{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .brand-badge{
          width:44px;height:44px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          background:linear-gradient(45deg, #495057, #6c757d);
          color:#fff;font-size:22px;box-shadow:0 2px 6px rgba(0,0,0,0.15);
        }
        .brand-title{margin:0;font-size:1.6rem}
        .brand-sub{margin:0;color:var(--muted);font-size:0.95rem}

        .status-row{
          display:flex;align-items:center;gap:12px;
          background:#fff;border:1px solid var(--border);border-radius:8px;
          padding:10px 12px;
        }
        .status-pill{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;font-weight:600}
        .status-pill .dot{width:8px;height:8px;border-radius:50%}
        .status-pill.is-live{background:var(--green-100);color:var(--green)}
        .status-pill.is-live .dot{background:var(--green)}
        .status-pill.is-loading{background:#fff3cd;color:#b45309;border:1px solid #ffe8a1}
        .status-pill.is-loading .dot{background:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,0.2);animation:pulse 1.5s infinite}
        .muted{color:var(--muted);font-size:0.9rem}
        .divider{height:18px;width:1px;background:var(--border);}

        .btn{
          margin-left:auto;
          padding:8px 14px;
          background:#f8f9fa;
          border:1px solid var(--border);
          border-radius:8px;
          color:#212529;
          font-size:0.95rem;font-weight:600;cursor:pointer;
          transition:background .2s,transform .1s,box-shadow .2s;
        }
        .btn:hover{background:#e9ecef;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
        .btn:disabled{opacity:.6;cursor:not-allowed}

        .status{
          margin-top:12px;
          padding:12px 14px;
          border-radius:8px;
          background:var(--green-100);
          border:1px solid #c7ebd2;
          color:#166534;
          font-weight:600;
        }

        /* Layout */
        .layout{
          display:grid;
          grid-template-columns: 1fr 300px;
          gap:20px;
          max-width:1200px;
          width:100%;
          margin:18px auto 24px;
          padding:0 16px;
        }

        /* Messages */
        .messages{
          background:#fff;border:1px solid var(--border);
          border-radius:12px;padding:18px;
        }
        .section-title{
          display:flex;align-items:center;gap:10px;margin-bottom:12px;
        }
        .section-title h2{margin:0;font-size:1.25rem}
        .section-icon{
          width:36px;height:36px;border-radius:8px;
          display:flex;align-items:center;justify-content:center;
          background:#000000;font-size:18px;
        }
        .section-icon.alt{background:#697287}
        .count-badge{
          margin-left:auto;
          padding:6px 10px;border-radius:999px;
          background:#e9ecef;color:#495057;font-weight:700;font-size:.8rem;
        }

        .empty{
          text-align:center;color:#6b7280;background:#f8f9fa;
          border:2px dashed var(--border);border-radius:8px;padding:32px 16px;
        }
        .empty.alt{background:#fafafa;border-style:dashed}
        .empty-emoji{font-size:2.8rem;opacity:.6;margin-bottom:8px}

        .chat-list{display:flex;flex-direction:column;gap:12px}
        .chat-bubble{
          border-radius:0 6px 6px 0;
          padding:14px 14px 12px;
          border-left:3px solid transparent;
          background:#fff;
          box-shadow:none;
          animation:slideIn .35s ease both;
          overflow-wrap:anywhere; word-break:break-word;
        }
        /* User message */
        .chat-bubble.user{
          background:#f8f9fa;
          border-left-color:#6c757d;
          box-shadow:none;
        }
        /* Assistant message */
        .chat-bubble.assistant{
          background:#ffffff;
          border-left-color:#28a745;
          box-shadow:var(--assistant-shadow);
        }
        .bubble-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .avatar{
          width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;
        }
        .avatar.a{background:#e8e8e88c}
        .avatar.u{background:#1eb33b}
        .who{font-weight:800;font-size:.85rem;letter-spacing:.3px;text-transform:uppercase}
        .who-a{color:#6956568c}
        .who-u{color:#1eb33b}
        .bubble-text{margin:0;font-size:1rem;line-height:1.55;color:#212529}

        /* Uploader (dashed area) */
        .uploader{
          margin-top:16px;
          border:2px dashed var(--border);
          border-radius:8px;
          padding:18px;
          background:#fff;
          display:flex;flex-direction:column;align-items:center;gap:4px;
          color:#495057;
          cursor:pointer;
        }
        .uploader-title{font-weight:700}
        .uploader-sub{font-size:.9rem;color:#6c757d}

        /* Sidebar */
        .sidebar{
          position:sticky;top:20px;align-self:start;
          background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px;
          max-height:calc(100vh - 100px);overflow:auto;
        }
        .summary-card{
          position:relative;background:#fff;border:1px solid #9cb3ff;border-radius:10px;padding:16px;
          box-shadow:0 1px 2px rgba(0,0,0,0.05);
        }
        .chip{
          position:absolute;top:-10px;right:12px;
          background:#dad6f0;color:#7a5d00;border-radius:999px;padding:2px 8px;
          font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
        }
        .summary-text{margin:0;color:#5c3d00;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}

        /* Footer */
        .app-footer{
          background:#fff;border-top:1px solid var(--border);
          padding:14px 16px;text-align:center;color:#6c757d;font-size:.95rem;
        }

        /* Animations & responsive */
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

        @media (max-width: 960px){
          .layout{grid-template-columns:1fr;gap:14px}
          .sidebar{position:relative;top:0;max-height:none}
          .brand-title{font-size:1.35rem}
          .brand-sub{font-size:.9rem}
        }
      `}</style>
    </div>
  );
}
