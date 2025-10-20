// Enhanced error handling utilities
export const handleApiError = (error, context = '') => {
  console.error(`API Error ${context}:`, error);
  
  // Extract meaningful error message
  let message = 'An unexpected error occurred';
  
  if (error.message) {
    message = error.message;
  } else if (error.error?.message) {
    message = error.error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  // Add context if provided
  if (context) {
    message = `${context}: ${message}`;
  }
  
  return message;
};

// Retry utility for failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Network status detection
export const isOnline = () => navigator.onLine;

// Offline queue for failed requests
class OfflineQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }
  
  add(request) {
    this.queue.push({
      ...request,
      timestamp: Date.now()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }
  
  async processQueue() {
    if (this.queue.length === 0) return;
    
    const requests = [...this.queue];
    this.queue = [];
    localStorage.removeItem('offlineQueue');
    
    for (const request of requests) {
      try {
        await request.fn();
      } catch (error) {
        // Re-queue if still failing
        this.add(request);
      }
    }
  }
}

export const offlineQueue = new OfflineQueue();

// Optimistic update helper
export const createOptimisticUpdate = (optimisticFn, rollbackFn) => {
  return {
    optimistic: optimisticFn,
    rollback: rollbackFn
  };
};
