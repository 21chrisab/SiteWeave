import React, { Suspense, lazy } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy load main views
export const DashboardView = lazy(() => import('../views/DashboardView'));
export const ProjectDetailsView = lazy(() => import('../views/ProjectDetailsView'));
export const CalendarView = lazy(() => import('../views/CalendarView'));
export const MessagesView = lazy(() => import('../views/MessagesView'));
export const ContactsView = lazy(() => import('../views/ContactsView'));
export const SettingsView = lazy(() => import('../views/SettingsView'));

// Loading wrapper component
export const LazyViewWrapper = ({ children }) => (
    <Suspense fallback={
        <div className="flex items-center justify-center h-full">
            <LoadingSpinner variant="spinner" size="lg" />
        </div>
    }>
        {children}
    </Suspense>
);
