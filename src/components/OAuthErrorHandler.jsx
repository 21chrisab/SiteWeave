import React, { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

function OAuthErrorHandler() {
  const { addToast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      // Show user-friendly error message
      let errorMessage = 'Authentication failed. ';
      
      if (error === 'server_error') {
        errorMessage += 'Server error occurred during authentication. ';
      } else if (error === 'access_denied') {
        errorMessage += 'Access was denied. ';
      } else if (error === 'invalid_request') {
        errorMessage += 'Invalid authentication request. ';
      }
      
      if (errorDescription) {
        // Decode URL-encoded description
        const decodedDescription = decodeURIComponent(errorDescription);
        errorMessage += decodedDescription;
      }
      
      addToast(errorMessage, 'error');
      
      // Clean up the URL by removing error parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [addToast]);

  return null; // This component doesn't render anything
}

export default OAuthErrorHandler;
