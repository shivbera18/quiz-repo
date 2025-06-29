"use client";

import { useState, useEffect } from 'react';

export default function DiagnosePage() {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      tests: {}
    };

    // Test 1: Can we make a fetch request?
    try {
      results.tests.fetchAvailable = typeof fetch !== 'undefined';
    } catch (e) {
      results.tests.fetchAvailable = false;
      results.tests.fetchError = e?.toString();
    }

    // Test 2: Can we access the API endpoint?
    try {
      const response = await fetch('/api/subjects');
      results.tests.apiResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      };

      if (response.ok) {
        const data = await response.json();
        results.tests.apiData = {
          length: data.length,
          subjects: data.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description?.substring(0, 50) + '...'
          }))
        };
      }
    } catch (e) {
      results.tests.apiError = e?.toString();
    }

    // Test 3: Authentication check
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      results.tests.auth = {
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token?.length || 0,
        userParseable: user ? (() => {
          try {
            JSON.parse(user);
            return true;
          } catch {
            return false;
          }
        })() : false
      };
    } catch (e) {
      results.tests.authError = e?.toString();
    }

    // Test 4: Console logging
    console.log('🔍 DIAGNOSTICS RESULTS:', results);

    setDiagnostics(results);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>🔍 Running Diagnostics...</h1>
        <p>Please wait while we run comprehensive tests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>🔍 Sectional Tests Diagnostics</h1>
      
      <div style={{ backgroundColor: 'white', padding: '15px', margin: '10px 0', border: '1px solid #ccc' }}>
        <h2>📊 Summary</h2>
        <p><strong>Timestamp:</strong> {diagnostics.timestamp}</p>
        <p><strong>Current URL:</strong> {diagnostics.url}</p>
        <p><strong>User Agent:</strong> {diagnostics.userAgent}</p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', margin: '10px 0', border: '1px solid #ccc' }}>
        <h2>🌐 API Tests</h2>
        <p><strong>Fetch Available:</strong> {diagnostics.tests.fetchAvailable ? '✅ Yes' : '❌ No'}</p>
        
        {diagnostics.tests.apiResponse ? (
          <div>
            <p><strong>API Response Status:</strong> {diagnostics.tests.apiResponse.status} {diagnostics.tests.apiResponse.statusText}</p>
            <p><strong>API Response OK:</strong> {diagnostics.tests.apiResponse.ok ? '✅ Yes' : '❌ No'}</p>
            
            {diagnostics.tests.apiData && (
              <div>
                <p><strong>Subjects Count:</strong> {diagnostics.tests.apiData.length}</p>
                <p><strong>Subjects:</strong></p>
                <ul>
                  {diagnostics.tests.apiData.subjects.map((subject: any, index: number) => (
                    <li key={index}>{subject.name} - {subject.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p><strong>API Error:</strong> {diagnostics.tests.apiError}</p>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', margin: '10px 0', border: '1px solid #ccc' }}>
        <h2>🔐 Authentication Tests</h2>
        {diagnostics.tests.auth ? (
          <div>
            <p><strong>Has Token:</strong> {diagnostics.tests.auth.hasToken ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Token Length:</strong> {diagnostics.tests.auth.tokenLength}</p>
            <p><strong>Has User:</strong> {diagnostics.tests.auth.hasUser ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User Data Valid:</strong> {diagnostics.tests.auth.userParseable ? '✅ Yes' : '❌ No'}</p>
          </div>
        ) : (
          <p><strong>Auth Error:</strong> {diagnostics.tests.authError}</p>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', margin: '10px 0', border: '1px solid #ccc' }}>
        <h2>🔧 Troubleshooting</h2>
        {diagnostics.tests.apiData?.length > 0 ? (
          <div>
            <p>✅ <strong>API is working correctly and returning {diagnostics.tests.apiData.length} subjects.</strong></p>
            <p>🔍 If subjects aren't showing on the sectional tests page, the issue is likely:</p>
            <ul>
              <li>• Component rendering issue</li>
              <li>• State management problem</li>
              <li>• Authentication blocking the request</li>
              <li>• React hydration mismatch</li>
            </ul>
            <p>📝 <strong>Next Steps:</strong></p>
            <ul>
              <li>• Open browser developer tools (F12)</li>
              <li>• Check Console tab for JavaScript errors</li>
              <li>• Check Network tab to see if API calls are being made</li>
              <li>• Clear browser cache and cookies</li>
            </ul>
          </div>
        ) : (
          <div>
            <p>❌ <strong>API is not returning subjects data.</strong></p>
            <p>🔍 Possible issues:</p>
            <ul>
              <li>• Database connection problem</li>
              <li>• Data not seeded properly</li>
              <li>• API endpoint not working</li>
              <li>• Network connectivity issue</li>
            </ul>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', margin: '10px 0', border: '1px solid #ccc' }}>
        <h2>📋 Raw Data</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={runDiagnostics}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Re-run Diagnostics
        </button>
        <button 
          onClick={() => window.open('/dashboard/sectional-tests', '_blank')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          🎯 Test Sectional Tests Page
        </button>
      </div>
    </div>
  );
}
