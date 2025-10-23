// Calendar Integration Utilities
// This file handles OAuth callbacks and API integrations for Google Calendar and Outlook
import electronOAuth from './electronOAuth.js';

export const handleGoogleCalendarCallback = async (code) => {
    try {
        // Exchange authorization code for access token
        const { access_token } = await exchangeGoogleToken(code);

        // Fetch events from Google Calendar
        const data = await fetchGoogleCalendarEvents(access_token);
        return transformGoogleEvents(data.items || []);

    } catch (error) {
        console.error('Google Calendar integration error:', error);
        throw error;
    }
};

export const startGoogleCalendarOAuth = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
    }

    try {
        const result = await electronOAuth.startOAuthFlow('google', {
            clientId: clientId,
            clientSecret: clientSecret
        });

        const tokenData = await electronOAuth.exchangeCodeForToken('google', result.code, {
            clientId: clientId,
            clientSecret: clientSecret
        });

        // Fetch events from Google Calendar
        const data = await fetchGoogleCalendarEvents(tokenData.access_token);
        return transformGoogleEvents(data.items || []);

    } catch (error) {
        console.error('Google Calendar OAuth error:', error);
        throw error;
    }
};

export const handleOutlookCalendarCallback = async (code) => {
    try {
        // Exchange authorization code for access token
        const { access_token } = await exchangeOutlookToken(code);

        // Fetch events from Microsoft Graph
        const data = await fetchOutlookCalendarEvents(access_token);
        return transformOutlookEvents(data.value || []);

    } catch (error) {
        console.error('Outlook Calendar integration error:', error);
        throw error;
    }
};

export const startOutlookCalendarOAuth = async () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    
    if (!clientId) {
        throw new Error('Microsoft OAuth client ID not configured');
    }

    try {
        const result = await electronOAuth.startOAuthFlow('microsoft', {
            clientId: clientId
        });

        const tokenData = await electronOAuth.exchangeCodeForToken('microsoft', result.code, {
            clientId: clientId
        });

        // Fetch events from Microsoft Graph
        const data = await fetchOutlookCalendarEvents(tokenData.access_token);
        return transformOutlookEvents(data.value || []);

    } catch (error) {
        console.error('Microsoft Calendar OAuth error:', error);
        throw error;
    }
};

// Google Calendar API Integration
const exchangeGoogleToken = async (code) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    const redirectUri = window.electronAPI?.isElectron 
        ? 'http://127.0.0.1:5000/google-callback'
        : window.location.origin + '/calendar';

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange Google token');
    }

    return await response.json();
};

const fetchGoogleCalendarEvents = async (accessToken) => {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar events');
    }

    return await response.json();
};

// Microsoft Graph API Integration
const exchangeOutlookToken = async (code) => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    // Use the same redirect URI used during authorization (Calendar page)
    const redirectUri = window.location.origin + '/calendar';

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            scope: 'https://graph.microsoft.com/Calendars.Read',
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange Microsoft token');
    }

    return await response.json();
};

const fetchOutlookCalendarEvents = async (accessToken) => {
    // Fetch all pages of events (Graph paginates results)
    let url = 'https://graph.microsoft.com/v1.0/me/events?$top=100&$orderby=start/dateTime asc';
    const all = [];
    let pageCount = 0;

    while (url && pageCount < 20) { // hard cap to avoid infinite loops
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error('Failed to fetch Outlook Calendar events: ' + text);
        }

        const data = await response.json();
        if (Array.isArray(data.value)) all.push(...data.value);
        url = data['@odata.nextLink'] || null;
        pageCount += 1;
    }

    return { value: all };
};

const transformGoogleEvents = (events) => {
    return events.map(event => ({
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start_time: event.start?.dateTime || event.start?.date + 'T09:00:00',
        end_time: event.end?.dateTime || event.end?.date + 'T17:00:00',
        location: event.location || '',
        attendees: event.attendees?.map(a => a.email).join(', ') || '',
        category: 'other',
        color: '#6B7280',
        is_all_day: !event.start?.dateTime,
        external_id: event.id,
        external_source: 'google'
    }));
};

// Decode HTML entities to text
const decodeHtmlEntities = (text) => {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

// Convert HTML string to plain text, preserving basic line breaks
const htmlToPlainText = (html) => {
    if (!html) return '';
    const normalized = html
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/(p|div|li)\s*>/gi, '\n');
    const container = document.createElement('div');
    container.innerHTML = normalized;
    const text = container.textContent || container.innerText || '';
    return text.replace(/\u00A0/g, ' ') // nbsp
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const transformOutlookEvents = (events) => {
    return events.map(event => {
        const raw = event.body?.content || '';
        const description = event.body?.contentType === 'html'
            ? htmlToPlainText(raw)
            : decodeHtmlEntities(raw);

        return {
            title: event.subject || 'Untitled Event',
            description: description,
            start_time: event.start?.dateTime || event.start?.date + 'T09:00:00',
            end_time: event.end?.dateTime || event.end?.date + 'T17:00:00',
            location: event.location?.displayName || '',
            attendees: event.attendees?.map(a => a.emailAddress?.address).join(', ') || '',
            category: 'other',
            color: '#6B7280',
            is_all_day: !event.start?.dateTime,
            external_id: event.id,
            external_source: 'outlook'
        };
    });
};

// Parse URL parameters for OAuth callbacks
export const parseOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    return { code, state, error };
};

// Clear OAuth parameters from URL
export const clearOAuthParams = () => {
    const url = new URL(window.location);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.pathname);
};

// Prepare events for DB insert by picking only allowed columns
export const prepareCalendarEventsForInsert = (events, userId = null) => {
    return events.map(e => ({
        title: e.title,
        description: e.description || '',
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location || '',
        attendees: e.attendees || '',
        category: e.category || 'other',
        color: e.color || '#6B7280',
        is_all_day: !!e.is_all_day,
        recurrence: e.recurrence || null,
        user_id: userId
    }));
};
