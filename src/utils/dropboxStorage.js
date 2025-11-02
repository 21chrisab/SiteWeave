import { Dropbox } from 'dropbox';
import electronOAuth from './electronOAuth.js';

const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;

class DropboxStorage {
  constructor() {
    this.dbx = null;
    this.accessToken = null;
    this.isConnected = false;
  }

  // Initialize Dropbox client
  initialize() {
    if (!DROPBOX_APP_KEY) {
      console.error('Dropbox App Key not found. Please set VITE_DROPBOX_APP_KEY in your environment variables.');
      return false;
    }

    this.dbx = new Dropbox({
      accessToken: this.accessToken,
      clientId: DROPBOX_APP_KEY
    });

    return true;
  }

  // Set access token and initialize client
  setAccessToken(token) {
    this.accessToken = token;
    this.isConnected = !!token;
    
    if (token) {
      this.initialize();
      // Store token in localStorage for persistence
      localStorage.setItem('dropbox_access_token', token);
    } else {
      localStorage.removeItem('dropbox_access_token');
    }
  }

  // Load token from localStorage on app start
  loadStoredToken() {
    const storedToken = localStorage.getItem('dropbox_access_token');
    if (storedToken) {
      this.setAccessToken(storedToken);
      return true;
    }
    return false;
  }

  // Start OAuth flow
  async startOAuthFlow() {
    if (!DROPBOX_APP_KEY) {
      throw new Error('Dropbox App Key not configured');
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = electronOAuth.generateCodeVerifier();
    const codeChallenge = await electronOAuth.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    sessionStorage.setItem('dropbox_code_verifier', codeVerifier);

    try {
      // Use electronOAuth helper for unified OAuth flow
      const result = await electronOAuth.startOAuthFlow('dropbox', {
        clientId: DROPBOX_APP_KEY,
        codeChallenge: codeChallenge
      });

      // Exchange code for token
      const tokenData = await electronOAuth.exchangeCodeForToken('dropbox', result.code, {
        clientId: DROPBOX_APP_KEY,
        clientSecret: '', // Dropbox doesn't use client secret for PKCE
        codeVerifier: codeVerifier
      });

      this.setAccessToken(tokenData.access_token);
      return tokenData.access_token;
    } catch (error) {
      console.error('Dropbox OAuth error:', error);
      throw error;
    }
  }


  // Upload file to Dropbox with retry and error handling
  async uploadFile(file, folderPath, fileName, retries = 2) {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox. Please connect your account first.');
    }

    try {
      // Normalize path - ensure it starts with /SiteWeave and doesn't have double slashes
      const normalizedFolderPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
      const cleanFolderPath = normalizedFolderPath.replace(/\/+/g, '/');
      const filePath = `/SiteWeave${cleanFolderPath}/${fileName}`.replace(/\/+/g, '/');
      
      // Convert file to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload file
      const response = await this.dbx.filesUpload({
        path: filePath,
        contents: arrayBuffer,
        mode: { '.tag': 'overwrite' }
      });

      // Get shared link
      const sharedLinkResponse = await this.dbx.sharingCreateSharedLinkWithSettings({
        path: filePath,
        settings: {
          requested_visibility: 'public'
        }
      });

      return {
        success: true,
        filePath: filePath,
        sharedUrl: sharedLinkResponse.result.url,
        dropboxId: response.result.id
      };
    } catch (error) {
      // Handle token expiration
      if (error.status === 401 || error.status === 403) {
        console.warn('Dropbox token expired during upload');
        this.setAccessToken(null);
        throw new Error('Dropbox connection expired. Please reconnect your account in Settings.');
      }

      // Handle 400 errors - likely path format issue
      if (error.status === 400) {
        console.error('Dropbox upload error (400):', error);
        // Try to extract more specific error message
        const errorMessage = error.error?.error_summary || error.message || 'Invalid request';
        throw new Error(`Failed to upload file to Dropbox: ${errorMessage}. Please check the file path and try again.`);
      }

      // Retry on network errors
      if (retries > 0 && (error.status >= 500 || error.status === 0)) {
        console.log(`Retrying upload (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.uploadFile(file, folderPath, fileName, retries - 1);
      }

      console.error('Dropbox upload error:', error);
      throw new Error(`Failed to upload file to Dropbox: ${error.message || error.error?.error_summary || 'Unknown error'}`);
    }
  }

  // Get shared link for existing file
  async getSharedLink(filePath) {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await this.dbx.sharingCreateSharedLinkWithSettings({
        path: filePath,
        settings: {
          requested_visibility: 'public'
        }
      });

      return response.result.url;
    } catch (error) {
      // Handle token expiration
      if (error.status === 401 || error.status === 403) {
        this.setAccessToken(null);
        throw new Error('Dropbox connection expired. Please reconnect your account in Settings.');
      }

      console.error('Error getting shared link:', error);
      throw new Error(`Failed to get shared link: ${error.message || 'Unknown error'}`);
    }
  }

  // Check if file exists
  async fileExists(filePath) {
    if (!this.isConnected || !this.dbx) {
      return false;
    }

    try {
      await this.dbx.filesGetMetadata({ path: filePath });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete file
  async deleteFile(filePath) {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      await this.dbx.filesDeleteV2({ path: filePath });
      return true;
    } catch (error) {
      // Handle token expiration
      if (error.status === 401 || error.status === 403) {
        this.setAccessToken(null);
        throw new Error('Dropbox connection expired. Please reconnect your account in Settings.');
      }

      // Handle file not found gracefully
      if (error.status === 409 || error.status === 404) {
        console.warn('File not found, may have already been deleted:', filePath);
        return true; // Consider it successful if file doesn't exist
      }

      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message || 'Unknown error'}`);
    }
  }

  // Get account info
  async getAccountInfo() {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await this.dbx.usersGetCurrentAccount();
      return response.result;
    } catch (error) {
      // Handle token expiration
      if (error.status === 401 || error.status === 403) {
        this.setAccessToken(null);
        throw new Error('Dropbox connection expired. Please reconnect your account in Settings.');
      }

      console.error('Error getting account info:', error);
      throw new Error(`Failed to get account info: ${error.message || 'Unknown error'}`);
    }
  }

  // Disconnect from Dropbox
  disconnect() {
    this.setAccessToken(null);
    this.dbx = null;
    this.isConnected = false;
  }

  // Check if connected
  isDropboxConnected() {
    return this.isConnected && !!this.accessToken;
  }

  // Check connection status by making a lightweight API call
  async checkConnection() {
    if (!this.isConnected || !this.dbx) {
      return false;
    }

    try {
      // Make a lightweight API call to verify token is still valid
      await this.dbx.usersGetCurrentAccount();
      return true;
    } catch (error) {
      // If token is expired or invalid, clear it
      if (error.status === 401 || error.status === 403) {
        console.warn('Dropbox token expired or invalid');
        this.setAccessToken(null);
        return false;
      }
      // For other errors, assume connection is still valid but API call failed
      return true;
    }
  }

  // Attempt to refresh token (Note: Dropbox PKCE doesn't use refresh tokens)
  // This would require re-authentication in most cases
  async refreshToken() {
    // Dropbox PKCE flow doesn't provide refresh tokens
    // User needs to reconnect via OAuth
    throw new Error('Token refresh requires re-authentication. Please reconnect your Dropbox account.');
  }

  // Get storage usage information
  async getStorageUsage() {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox');
    }

    try {
      const response = await this.dbx.usersGetSpaceUsage();
      return {
        used: response.result.used,
        allocation: response.result.allocation['.tag'] === 'individual' 
          ? response.result.allocation.allocated 
          : null,
        type: response.result.allocation['.tag']
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      throw new Error(`Failed to get storage usage: ${error.message}`);
    }
  }

  // List files in a folder
  async listFiles(folderPath = '/SiteWeave') {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox');
    }

    // Normalize path - ensure it doesn't end with / (unless it's root)
    let normalizedPath = folderPath.trim();
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    // Ensure path starts with /
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }

    try {
      const response = await this.dbx.filesListFolder({
        path: normalizedPath
      });

      return response.result.entries.map(entry => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        size: entry.size,
        isFolder: entry['.tag'] === 'folder',
        modified: entry.server_modified || entry.client_modified,
        sharedUrl: null // Would need to fetch separately
      }));
    } catch (error) {
      if (error.status === 409) {
        // Folder doesn't exist yet, try to create it or return empty
        return [];
      }
      if (error.status === 400) {
        // Bad request - likely path format issue, try with /SiteWeave as fallback
        if (normalizedPath !== '/SiteWeave') {
          console.warn(`Path ${normalizedPath} failed, trying /SiteWeave instead`);
          try {
            const fallbackResponse = await this.dbx.filesListFolder({ path: '/SiteWeave' });
            return fallbackResponse.result.entries.map(entry => ({
              id: entry.id,
              name: entry.name,
              path: entry.path_display,
              size: entry.size,
              isFolder: entry['.tag'] === 'folder',
              modified: entry.server_modified || entry.client_modified,
              sharedUrl: null
            }));
          } catch (fallbackError) {
            // If even root fails, return empty
            return [];
          }
        }
        return [];
      }
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message || 'Unknown error'}`);
    }
  }
}

// Create singleton instance
const dropboxStorage = new DropboxStorage();

export default dropboxStorage;
