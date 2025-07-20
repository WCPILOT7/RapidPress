import React from 'react';

export default function Test() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDev = urlParams.get('bypass') === 'true';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
        <div className="space-y-2">
          <p><strong>Current URL:</strong> {window.location.href}</p>
          <p><strong>Search Params:</strong> {window.location.search}</p>
          <p><strong>Bypass Mode:</strong> {isDev ? 'YES' : 'NO'}</p>
        </div>
      </div>
    </div>
  );
}