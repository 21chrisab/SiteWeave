import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Suppress WebSocket connection errors from Supabase realtime subscriptions
// These errors are expected when realtime is not enabled for certain tables
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    // Filter out WebSocket connection errors
    if (message.includes('WebSocket') && message.includes('failed')) {
      return; // Suppress WebSocket errors
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)


