import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Turn = { role: string; message: string };

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';

export function App() {
  const [summary, setSummary] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // Store successfully fetched data to avoid losing it when fetch fails
  const dataCache = useRef<{turns: Turn[], summary: string | null}>({turns: [], summary: null});

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add timestamp parameter to avoid caching issues
      const timestamp = new Date().getTime();
      const resp = await fetch(`${BACKEND_BASE}/conversations/latest?t=${timestamp}`, { 
        cache: 'no-store',
        // Add timeout setting
        signal: AbortSignal.timeout(3000)
      });
      
      if (!resp.ok) {
        throw new Error(`Backend error ${resp.status}`);
      }
      
      const data = await resp.json();
      
      // Extract transcript data (backend now returns only agent messages)
      const transcript: any[] = data?.transcript || [];
      const cleanTurns: Turn[] = Array.isArray(transcript)
        ? transcript
            .filter((t) => t && typeof t.role === 'string' && typeof t.message !== 'undefined')
            .map((t) => ({ role: t.role, message: String(t.message ?? '') }))
        : [];
      
      // Extract summary data
      const s = data?.summary ?? null;
      
      // Update state and cache
      setTurns(cleanTurns);
      setSummary(typeof s === 'string' ? s : null);
      dataCache.current = {turns: cleanTurns, summary: typeof s === 'string' ? s : null};
      
      // Reset retry count
      setRetryCount(0);
      setLastFetchTime(timestamp);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      setError(e instanceof Error ? e.message : 'Loading failed');
      
      // Increase retry count
      setRetryCount(prev => prev + 1);
      
      // If retry count exceeds maximum, use cached data
      if (retryCount >= maxRetries) {
        setTurns(dataCache.current.turns);
        setSummary(dataCache.current.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  // Use a longer polling interval and exponential backoff strategy on errors
  useEffect(() => {
    fetchLatest();
    
    // Adjust polling interval based on retry count - set base interval to 10000ms (10 seconds)
    const interval = retryCount > 0 ? Math.min(10000 * Math.pow(1.5, retryCount), 30000) : 10000;
    
    const id = setInterval(fetchLatest, interval);
    return () => clearInterval(id);
  }, [fetchLatest, retryCount]);

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: 0,
      margin: 0
    }}>
      {/* Header Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '24px 32px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            🎙️
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '2.5rem', 
              fontWeight: '700',
              background: 'linear-gradient(45deg, #fff, #e0e7ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Miraco AI Transcript Viewer
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>
              Real-time conversation analytics powered by Axtr Labs
            </p>
          </div>
        </div>
        
        {/* Status Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 16,
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: loading ? '#fbbf24' : '#10b981',
              boxShadow: loading ? '0 0 10px #fbbf24' : '0 0 10px #10b981',
              animation: loading ? 'pulse 1.5s infinite' : 'none'
            }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              {loading ? 'Syncing...' : 'Live'}
            </span>
          </div>
          
          <div style={{ height: 20, width: '1px', background: 'rgba(255, 255, 255, 0.3)' }}></div>
          
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            Backend: {BACKEND_BASE}
          </span>
          
          {lastFetchTime > 0 && (
            <>
              <div style={{ height: 20, width: '1px', background: 'rgba(255, 255, 255, 0.3)' }}></div>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                Last sync: {new Date(lastFetchTime).toLocaleTimeString()}
              </span>
            </>
          )}
          
          <button 
            onClick={fetchLatest} 
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        
        {error && (
          <div style={{
            marginTop: 12,
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fecaca',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Transcript Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: 'white'
            }}>
              💬
            </div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.75rem', 
              fontWeight: '700',
              color: '#1f2937',
              background: 'linear-gradient(45deg, #1f2937, #4b5563)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Live Transcript
            </h2>
            {turns.length > 0 && (
              <div style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                background: 'linear-gradient(45deg, #10b981, #059669)',
                borderRadius: '20px',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {turns.length} message{turns.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {turns.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.3 }}>🎤</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '600' }}>
                Waiting for conversation...
              </h3>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Conversation messages will appear here after a call ends
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {turns.map((t, i) => (
                <div key={i} style={{
                  background: t.role === 'agent' 
                    ? 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)'
                    : 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid',
                  borderColor: t.role === 'agent' ? '#81d4fa' : '#ce93d8',
                  position: 'relative',
                  animation: `slideIn 0.5s ease-out ${i * 0.1}s both`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: t.role === 'agent' 
                        ? 'linear-gradient(45deg, #0288d1, #0277bd)'
                        : 'linear-gradient(45deg, #8e24aa, #7b1fa2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {t.role === 'agent' ? '🤖' : '👤'}
                    </div>
                    <span style={{
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      color: t.role === 'agent' ? '#01579b' : '#4a148c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t.role === 'agent' ? 'Miraco AI Agent' : 'Human'}
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    lineHeight: '1.6',
                    color: '#1f2937',
                    fontWeight: '400'
                  }}>
                    {t.message || <em style={{ color: '#6b7280' }}>(No message)</em>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Summary Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          height: 'fit-content',
          position: 'sticky',
          top: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: 'white'
            }}>
              📊
            </div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.75rem', 
              fontWeight: '700',
              color: '#1f2937',
              background: 'linear-gradient(45deg, #1f2937, #4b5563)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Summary
            </h2>
          </div>
          
          {summary ? (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #f59e0b',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '16px',
                background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Auto-generated
              </div>
              <p style={{
                margin: 0,
                fontSize: '1.05rem',
                lineHeight: '1.7',
                color: '#92400e',
                fontWeight: '500',
                whiteSpace: 'pre-wrap'
              }}>
                {summary}
              </p>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6b7280',
              background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
              borderRadius: '16px',
              border: '2px dashed #d1d5db'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.4 }}>📝</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600' }}>
                No summary yet
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                AI summary will appear after call analysis
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '20px 32px',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.9rem'
      }}>
        <p style={{ margin: 0 }}>
          🔄 Auto-refreshes every 10 seconds • 
          🔗 Connected to ElevenLabs webhooks • 
          ⚡ Real-time transcript processing
        </p>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}


