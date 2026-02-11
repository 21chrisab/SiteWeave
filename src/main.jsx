import './i18n/config'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteErrorElement from './components/RouteErrorElement.jsx'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

// Unregister any existing service workers to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

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

const router = createBrowserRouter([
  { 
    path: '/*', 
    element: <App />,
    errorElement: <RouteErrorElement />
  }
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)


