// Electron OAuth Helper
// Handles OAuth flows for desktop applications using custom protocols

class ElectronOAuth {
  constructor() {
    this.isElectron = window.electronAPI?.isElectron || false;
    this.setupListeners();
  }

  setupListeners() {
    if (this.isElectron && window.electronAPI) {
      // Listen for OAuth callbacks from main process
      window.electronAPI.onOAuthCallback((data) => {
        this.handleOAuthCallback(data);
      });
    }
  }

  // Start OAuth flow - works for both web and desktop
  async startOAuthFlow(provider, config) {
    const redirectUri = this.isElectron 
      ? `siteweave://${provider}-callback`
      : `${window.location.origin}/${provider}-callback`;

    const authUrl = this.buildAuthUrl(provider, config, redirectUri);

    if (this.isElectron) {
      // In Electron, open in default browser
      window.electronAPI.openExternal(authUrl);
      
      // Return a promise that resolves when callback is received
      return new Promise((resolve, reject) => {
        this.pendingOAuth = { resolve, reject, provider };
        
        // Set timeout for OAuth flow
        setTimeout(() => {
          if (this.pendingOAuth) {
            this.pendingOAuth.reject(new Error('OAuth timeout'));
            this.pendingOAuth = null;
          }
        }, 300000); // 5 minutes timeout
      });
    } else {
      // In web browser, use popup
      return this.startWebOAuthFlow(authUrl, provider);
    }
  }

  // Build OAuth URL based on provider
  buildAuthUrl(provider, config, redirectUri) {
    const baseUrls = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      dropbox: 'https://www.dropbox.com/oauth2/authorize'
    };

    const scopes = {
      google: 'https://www.googleapis.com/auth/calendar.readonly',
      microsoft: 'https://graph.microsoft.com/calendars.read',
      dropbox: ''
    };

    const url = new URL(baseUrls[provider]);
    
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scopes[provider]);
    
    if (provider === 'dropbox') {
      url.searchParams.set('token_access_type', 'offline');
      if (config.codeChallenge) {
        url.searchParams.set('code_challenge', config.codeChallenge);
        url.searchParams.set('code_challenge_method', 'S256');
      }
    }

    if (config.state) {
      url.searchParams.set('state', config.state);
    }

    return url.toString();
  }

  // Handle OAuth callback from main process
  handleOAuthCallback(data) {
    if (!this.pendingOAuth) return;

    const { provider, code, error, errorDescription } = data;

    if (error) {
      this.pendingOAuth.reject(new Error(errorDescription || error));
    } else if (code) {
      this.pendingOAuth.resolve({ code, provider });
    }

    this.pendingOAuth = null;
  }

  // Web OAuth flow using popup
  async startWebOAuthFlow(authUrl, provider) {
    const popup = window.open(
      authUrl,
      `${provider}-oauth`,
      'width=600,height=600,scrollbars=yes,resizable=yes'
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth popup was closed'));
        }
      }, 1000);

      // Listen for OAuth completion
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === `${provider.toUpperCase()}_OAUTH_SUCCESS`) {
          clearInterval(checkClosed);
          popup.close();
          resolve({ code: event.data.code, provider });
        } else if (event.data.type === `${provider.toUpperCase()}_OAUTH_ERROR`) {
          clearInterval(checkClosed);
          popup.close();
          reject(new Error(event.data.error));
        }
      });
    });
  }

  // Generate PKCE code verifier
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate PKCE code challenge
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(provider, code, config) {
    const tokenUrls = {
      google: 'https://oauth2.googleapis.com/token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      dropbox: 'https://api.dropboxapi.com/oauth2/token'
    };

    const redirectUri = this.isElectron 
      ? `siteweave://${provider}-callback`
      : `${window.location.origin}/${provider}-callback`;

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    if (provider === 'dropbox' && config.codeVerifier) {
      body.set('code_verifier', config.codeVerifier);
    }

    const response = await fetch(tokenUrls[provider], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return await response.json();
  }
}

// Create singleton instance
const electronOAuth = new ElectronOAuth();

export default electronOAuth;
