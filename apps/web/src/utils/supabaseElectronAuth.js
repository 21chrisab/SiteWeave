// Supabase Electron OAuth Handler
// Handles Supabase OAuth flows for desktop applications using loopback method.
// The handler runs the code-for-session exchange itself so it does not depend
// on any React component being mounted when the IPC callback arrives.

class SupabaseElectronAuth {
  constructor() {
    this.isElectron = !!(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    this.supabaseClient = null;
    this.pendingCallbacks = [];
    this.processing = false;

    if (this.isElectron && window.electronAPI) {
      window.electronAPI.onOAuthCallback((data) => {
        this.handleSupabaseCallback(data);
      });
    }
  }

  // Called once the Supabase client is available so we can exchange the code.
  init(supabaseClient) {
    this.supabaseClient = supabaseClient;
    if (this.pendingCallbacks.length === 0) return;
    const queued = this.pendingCallbacks.splice(0);
    for (const data of queued) {
      this.handleSupabaseCallback(data);
    }
  }

  handleSupabaseCallback(data) {
    console.log('[OAuth] Supabase callback received:', data);

    if (!data || data.provider !== 'supabase') {
      return;
    }

    if (data.error) {
      const message = data.errorDescription || data.error;
      console.error('[OAuth] Provider returned error:', message);
      this.emitError(message);
      return;
    }

    if (!this.supabaseClient) {
      console.warn('[OAuth] Client not initialized yet, queuing callback');
      this.pendingCallbacks.push(data);
      return;
    }

    if (data.code) {
      this.exchangeCode(data.code);
      return;
    }

    if (data.hash) {
      this.applyHash(data.hash);
      return;
    }

    const msg = 'OAuth callback missing code/hash';
    console.warn('[OAuth]', msg, data);
    this.emitError(msg);
  }

  async exchangeCode(code) {
    if (this.processing) {
      console.warn('[OAuth] Exchange already in progress, ignoring duplicate code');
      return;
    }
    this.processing = true;
    console.log('[OAuth] Exchanging authorization code for session...');
    try {
      const { data, error } = await this.supabaseClient.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[OAuth] exchangeCodeForSession error:', error);
        this.emitError(error.message || 'OAuth code exchange failed');
        return;
      }
      console.log('[OAuth] Session established:', !!data?.session, data?.session?.user?.email || '');
      window.dispatchEvent(new CustomEvent('supabase-oauth-success', { detail: { session: data?.session || null } }));
    } catch (err) {
      console.error('[OAuth] exchangeCodeForSession threw:', err);
      this.emitError(err?.message || String(err));
    } finally {
      this.processing = false;
    }
  }

  async applyHash(hash) {
    if (this.processing) return;
    this.processing = true;
    try {
      const params = new URLSearchParams(String(hash).replace(/^#/, ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      if (!accessToken) {
        this.emitError('OAuth callback missing access_token');
        return;
      }
      console.log('[OAuth] Applying implicit-flow tokens via setSession...');
      const { data, error } = await this.supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('[OAuth] setSession error:', error);
        this.emitError(error.message || 'Failed to set session');
        return;
      }
      console.log('[OAuth] Session established (implicit):', !!data?.session);
      window.dispatchEvent(new CustomEvent('supabase-oauth-success', { detail: { session: data?.session || null } }));
    } catch (err) {
      console.error('[OAuth] applyHash threw:', err);
      this.emitError(err?.message || String(err));
    } finally {
      this.processing = false;
    }
  }

  emitError(message) {
    try {
      window.dispatchEvent(new CustomEvent('supabase-oauth-error', { detail: { message } }));
    } catch (_) {
      // ignore
    }
  }
}

const supabaseElectronAuth = new SupabaseElectronAuth();

export default supabaseElectronAuth;
