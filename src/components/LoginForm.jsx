import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

function LoginForm() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      addToast(t('auth.login_failed', { message: error.message }), 'error');
    } else {
      addToast(t('auth.login_successful'), 'success');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    // Use Electron loopback method if available
    const redirectTo = window.electronAPI?.isElectron 
      ? 'http://127.0.0.1:5000/supabase-callback'
      : window.location.origin;

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo
      }
    });

    if (error) {
      addToast(t('auth.google_login_failed', { message: error.message }), 'error');
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    
    // Use Electron loopback method if available
    const redirectTo = window.electronAPI?.isElectron 
      ? 'http://127.0.0.1:5000/supabase-callback'
      : window.location.origin;

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectTo,
        scopes: 'openid email profile'
      }
    });

    if (error) {
      addToast(t('auth.microsoft_login_failed', { message: error.message }), 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t('auth.sign_in_to_siteweave')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.access_organization_account')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.email_address')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.email_address')}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.password')}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                t('auth.sign_in')
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">{t('auth.or_continue_with')}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">{t('auth.google')}</span>
              </button>

              {/* Microsoft Login */}
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                  <path fill="#7fba00" d="M1 13h10v10H1z"/>
                  <path fill="#ffb900" d="M13 13h10v10H13z"/>
                </svg>
                <span className="ml-2">{t('auth.microsoft')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;