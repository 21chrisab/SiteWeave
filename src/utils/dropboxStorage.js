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


  // Upload file to Dropbox
  async uploadFile(file, folderPath, fileName) {
    if (!this.isConnected || !this.dbx) {
      throw new Error('Not connected to Dropbox. Please connect your account first.');
    }

    try {
      const filePath = `/SiteWeave${folderPath}/${fileName}`;
      
      // Upload file
      const response = await this.dbx.filesUpload({
        path: filePath,
        contents: file,
        mode: 'overwrite'
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
      console.error('Dropbox upload error:', error);
      throw new Error(`Failed to upload file to Dropbox: ${error.message}`);
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
      console.error('Error getting shared link:', error);
      throw new Error(`Failed to get shared link: ${error.message}`);
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
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
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
      console.error('Error getting account info:', error);
      throw new Error(`Failed to get account info: ${error.message}`);
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
}

// Create singleton instance
const dropboxStorage = new DropboxStorage();

export default dropboxStorage;
