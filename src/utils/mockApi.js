// Mock API endpoints for OAuth token exchange
// In a real application, these would be backend endpoints

export const mockGoogleTokenExchange = async (code) => {
    // This is a mock implementation
    // In a real app, you would make a request to your backend
    // which would exchange the code for an access token
    
    console.log('Mock Google token exchange for code:', code);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock access token
    return {
        access_token: 'mock_google_access_token',
        refresh_token: 'mock_google_refresh_token',
        expires_in: 3600
    };
};

export const mockOutlookTokenExchange = async (code) => {
    // This is a mock implementation
    // In a real app, you would make a request to your backend
    // which would exchange the code for an access token
    
    console.log('Mock Outlook token exchange for code:', code);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock access token
    return {
        access_token: 'mock_outlook_access_token',
        refresh_token: 'mock_outlook_refresh_token',
        expires_in: 3600
    };
};

// Mock Google Calendar API calls
export const mockGoogleCalendarEvents = async (accessToken) => {
    console.log('Mock Google Calendar API call with token:', accessToken);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock events
    return {
        items: [
            {
                id: 'mock_google_event_1',
                summary: 'Team Meeting',
                description: 'Weekly team standup',
                start: {
                    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                },
                end: {
                    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()
                },
                location: 'Conference Room A',
                attendees: [
                    { email: 'john@example.com' },
                    { email: 'jane@example.com' }
                ]
            },
            {
                id: 'mock_google_event_2',
                summary: 'Project Deadline',
                description: 'Final project submission',
                start: {
                    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                end: {
                    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
                },
                location: 'Office',
                attendees: []
            }
        ]
    };
};

// Mock Outlook Calendar API calls
export const mockOutlookCalendarEvents = async (accessToken) => {
    console.log('Mock Outlook Calendar API call with token:', accessToken);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock events
    return {
        value: [
            {
                id: 'mock_outlook_event_1',
                subject: 'Client Presentation',
                body: {
                    content: 'Prepare presentation for client meeting'
                },
                start: {
                    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
                },
                end: {
                    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString()
                },
                location: {
                    displayName: 'Client Office'
                },
                attendees: [
                    { emailAddress: { address: 'client@example.com' } }
                ]
            },
            {
                id: 'mock_outlook_event_2',
                subject: 'Lunch Meeting',
                body: {
                    content: 'Casual lunch with team'
                },
                start: {
                    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                },
                end: {
                    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()
                },
                location: {
                    displayName: 'Restaurant Downtown'
                },
                attendees: []
            }
        ]
    };
};
