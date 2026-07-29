"use client";

import React from 'react';

export default function TestAPI() {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        console.log('Making API call...');
        const response = await fetch('/api/subjects');
        console.log('Response:', response);
        
        if (response.ok) {
          const json = await response.json();
          console.log('Data:', json);
          setData(json);
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>API Test Page</h1>
      <p>Data loaded: {data.length} items</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
