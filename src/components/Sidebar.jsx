import React, { useState } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import LiveActivityIndicator from './LiveActivityIndicator';
import Avatar from './Avatar';

const ICONS = {
    Dashboard: <Icon path="M3.75 3v16.5h16.5M3.75 19.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v1.5m-3 0h3m10.5-16.5h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5zm-3 0h3m-3 10.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5h-3a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5zm-3 0h3" />,
    Projects: <Icon path="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />,
    Calendar: <Icon path="M6.75 3v2.25m10.5-2.25v2.25M3.75 11.25h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5M5.625 3.75h12.75c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H5.625c-1.035 0-1.875-.84-1.875-1.875V5.625c0-1.035.84-1.875 1.875-1.875z" />,
    Messages: <Icon path="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />,
    Contacts: <Icon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
    Settings: <Icon path="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
};

function Sidebar() {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            addToast('Error signing out: ' + error.message, 'error');
        } else {
            addToast('Signed out successfully', 'success');
        }
    };

    const handleStartTour = () => {
        // Clear onboarding preferences and trigger tour
        if (state.user) {
            localStorage.removeItem(`onboarding_${state.user.id}`);
            // Dispatch a custom event to trigger onboarding
            window.dispatchEvent(new CustomEvent('restartOnboarding'));
        }
    };
    const navItems = ['Dashboard', 'Projects', 'Calendar', 'Messages', 'Contacts', 'Settings'];

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white flex flex-col flex-shrink-0 border-r border-gray-100 transition-all duration-300`}>
            <div className="h-16 flex items-center px-6 font-bold text-xl text-gray-800">
                {!isCollapsed && (
                    <div className="flex items-center space-x-3">
                        <img src="/logo.svg" alt="SiteWeave" className="h-8 w-8" />
                        <span>SiteWeave</span>
                    </div>
                )}
                {isCollapsed && (
                    <img src="/logo.svg" alt="SiteWeave" className="h-8 w-8 mx-auto" />
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-auto p-1 hover:bg-gray-100 rounded"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <Icon path={isCollapsed ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} className="w-4 h-4" />
                </button>
            </div>
            <nav className="flex-1 px-4 space-y-1" data-onboarding="sidebar-nav" role="navigation" aria-label="Main navigation">
                {navItems.map(item => (
                    <div key={item}>
                        <a href="#" onClick={() => dispatch({type: 'SET_VIEW', payload: item})}
                           data-onboarding={item.toLowerCase()}
                           className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${state.activeView === item ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                           title={isCollapsed ? item : ''}
                           aria-label={`Navigate to ${item}`}
                           aria-current={state.activeView === item ? 'page' : undefined}>
                            {React.cloneElement(ICONS[item], { className: "w-5 h-5" })}
                            {!isCollapsed && <span>{item}</span>}
                        </a>
                        {item === 'Projects' && state.activeView === 'Projects' && !isCollapsed && (
                            <div className="pl-8 mt-1 space-y-1 border-l-2 border-gray-200 ml-2.5" role="group" aria-label="Project list">
                                {state.projects.map(p => (
                                    <a href="#" key={p.id} onClick={(e) => {
                                        e.preventDefault();
                                        dispatch({type: 'SET_PROJECT', payload: p.id});
                                    }}
                                       className={`block text-sm py-1 truncate ${state.selectedProjectId === p.id ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'}`}
                                       aria-label={`Select project: ${p.name}`}
                                       aria-current={state.selectedProjectId === p.id ? 'page' : undefined}>{p.name}</a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
             <div className="p-4 border-t border-gray-200">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <Avatar 
                                name={state.user?.user_metadata?.full_name || state.user?.email} 
                                size="lg"
                            />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {state.user?.user_metadata?.full_name || state.user?.email}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {state.user?.user_metadata?.title || 'User'}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" className="w-4 h-4" />
                    </button>
                </div>
                
                <LiveActivityIndicator />
            </div>
        </aside>
    );
}

export default Sidebar;