// Supabase Electron OAuth Handler
// Handles Supabase OAuth flows for desktop applications using loopback method

class SupabaseElectronAuth {
  constructor() {
    this.isElectron = window.electronAPI?.isElectron || false;
    this.setupListeners();
  }

  setupListeners() {
    if (this.isElectron && window.electronAPI) {
      // Listen for OAuth callbacks from main process
      window.electronAPI.onOAuthCallback((data) => {
        this.handleSupabaseCallback(data);
      });
    }
  }

  // Handle Supabase OAuth callback
  handleSupabaseCallback(data) {
    console.log('Supabase OAuth callback received:', data);
    
    if (data.provider === 'supabase' && data.hash) {
      // Parse the hash parameters
      const hashParams = new URLSearchParams(data.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const expiresAt = hashParams.get('expires_at');
      
      if (accessToken) {
        // Create a session object that Supabase can use
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt),
          token_type: 'bearer',
          user: this.parseUserFromToken(accessToken)
        };

        // Dispatch a custom event that the Supabase client can listen to
        window.dispatchEvent(new CustomEvent('supabase-oauth-callback', {
          detail: { session }
        }));
      }
    }
  }

  // Parse user info from JWT token (basic implementation)
  parseUserFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata || {},
        app_metadata: payload.app_metadata || {}
      };
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  // Override Supabase OAuth methods for Electron
  setupElectronOAuth() {
    if (!this.isElectron) return;

    // Override the default Supabase OAuth behavior
    const originalSignInWithOAuth = window.supabaseClient?.auth?.signInWithOAuth;
    if (originalSignInWithOAuth) {
      window.supabaseClient.auth.signInWithOAuth = async (options) => {
        // Use Electron loopback method
        const redirectTo = 'http://127.0.0.1:5000/supabase-callback';
        
        return originalSignInWithOAuth.call(window.supabaseClient.auth, {
          ...options,
          options: {
            ...options.options,
            redirectTo: redirectTo
          }
        });
      };
    }
  }
}

// Initialize the handler
const supabaseElectronAuth = new SupabaseElectronAuth();

// Setup Electron OAuth overrides
if (window.electronAPI?.isElectron) {
  supabaseElectronAuth.setupElectronOAuth();
}

export default supabaseElectronAuth;
