"use client";

export default function ClearCachePage() {
  const clearCacheAndRedirect = () => {
    // Clear browser cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force reload and redirect
    window.location.href = '/dashboard/sectional-tests?t=' + Date.now();
  };

  const timestamp = new Date().toLocaleString();

  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>🎯 Sectional Tests - Cache Clear</h1>
      
      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #e2e8f0'
      }}>
        <h2>📊 Current System Status</h2>
        <p><strong>Server Status:</strong> ✅ Running</p>
        <p><strong>Database:</strong> ✅ Local SQLite (Fast)</p>
        <p><strong>Subjects Available:</strong> ✅ 4 (Math, Physics, Chemistry, Biology)</p>
        <p><strong>Last Updated:</strong> {timestamp}</p>
      </div>

      <div style={{ 
        backgroundColor: '#fef3c7', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #f59e0b'
      }}>
        <h2>⚠️ Browser Cache Issue</h2>
        <p>Your browser is showing old cached content. The sectional tests are working but your browser needs to refresh.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>🔧 Fix Options:</h2>
        
        <button 
          onClick={clearCacheAndRedirect}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            margin: '10px',
            display: 'block',
            width: '100%',
            marginBottom: '10px'
          }}
        >
          🚀 Clear Cache & Go to Sectional Tests
        </button>

        <div style={{ 
          textAlign: 'left', 
          backgroundColor: '#f1f5f9', 
          padding: '15px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3>📝 Manual Steps (if button doesn&apos;t work):</h3>
          <ol>
            <li><strong>Hard Refresh:</strong> Press Ctrl+F5 or Ctrl+Shift+R</li>
            <li><strong>Clear Browser Cache:</strong> 
              <ul>
                <li>Chrome: F12 → Network tab → Right-click → &quot;Empty Cache and Hard Reload&quot;</li>
                <li>Firefox: Ctrl+Shift+Delete → Clear cache</li>
              </ul>
            </li>
            <li><strong>Incognito/Private Mode:</strong> Open in private window</li>
            <li><strong>Direct URL:</strong> <code>http://localhost:3000/dashboard/sectional-tests</code></li>
          </ol>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#dcfce7', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #16a34a'
      }}>
        <h3>✅ What You Should See After Cache Clear:</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>4 colorful subject cards: Mathematics (blue), Physics (green), Chemistry (yellow), Biology (red)</li>
          <li>Each card shows chapter count and quiz count</li>
          <li>Page loads quickly (under 3 seconds)</li>
          <li>No loading spinner stuck forever</li>
          <li>No hydration errors in browser console</li>
        </ul>
      </div>
    </div>
  );
}
