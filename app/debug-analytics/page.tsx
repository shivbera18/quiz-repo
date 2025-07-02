"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function DebugAnalyticsPage() {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const testConnection = async () => {
    if (!mounted) return
    
    setConnectionStatus('checking')
    
    try {
      console.log('Testing connection...')
      console.log('User:', user)
      
      // Check if we have auth data
      const token = typeof window !== 'undefined' ? (localStorage.getItem('authToken') || localStorage.getItem('token')) : null
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      
      setDebugInfo({
        hasUser: !!user,
        hasToken: !!token,
        hasUserData: !!userData,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'No token',
        user: user ? { ...user } : null,
        localStorage: typeof window !== 'undefined' ? {
          token: token ? 'Present' : 'Missing',
          authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing',
          user: userData ? 'Present' : 'Missing'
        } : {
          token: 'N/A (SSR)',
          authToken: 'N/A (SSR)',
          user: 'N/A (SSR)'
        }
      })
      
      if (token) {
        // Test API call
        const response = await fetch('/api/results', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        setApiResponse({
          status: response.status,
          ok: response.ok,
          data: data
        })
        
        if (response.ok && data.results) {
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('disconnected')
        }
      } else {
        setConnectionStatus('disconnected')
        setApiResponse({ error: 'No authentication token found' })
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('disconnected')
      setApiResponse({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  useEffect(() => {
    if (mounted) {
      testConnection()
    }
  }, [user, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Analytics Connection Debug</h1>
          <div className="border rounded-lg p-6">
            <div className="text-lg font-medium text-yellow-600">
              🔄 Loading...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Analytics Connection Debug</h1>
        
        <div className="grid gap-6">
          {/* Connection Status */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
            <div className={`text-lg font-medium ${
              connectionStatus === 'connected' ? 'text-green-600' : 
              connectionStatus === 'disconnected' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {connectionStatus === 'connected' && '✅ Connected'}
              {connectionStatus === 'disconnected' && '❌ Disconnected'}
              {connectionStatus === 'checking' && '🔄 Checking...'}
            </div>
            <button 
              onClick={testConnection}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Connection
            </button>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* API Response */}
          {apiResponse && (
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">API Response</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={() => typeof window !== 'undefined' && (window.location.href = '/auth/login')}
                className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Go to Login
              </button>
              <button 
                onClick={() => typeof window !== 'undefined' && (window.location.href = '/analytics')}
                className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Go to Analytics
              </button>
              <button 
                onClick={() => typeof window !== 'undefined' && (window.location.href = '/dashboard')}
                className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.clear()
                    window.location.reload()
                  }
                }}
                className="block w-full text-left px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-red-700"
              >
                Clear Storage & Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
