import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
      return;
    }

    const key = event.key.toLowerCase();
    const isCtrl = event.ctrlKey || event.metaKey; // Support both Ctrl and Cmd
    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    // Create a key combination string
    const combination = [
      isCtrl ? 'ctrl' : '',
      isAlt ? 'alt' : '',
      isShift ? 'shift' : '',
      key
    ].filter(Boolean).join('+');

    // Find matching shortcut
    const shortcut = shortcuts.find(s => s.key === combination);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Common keyboard shortcuts for task management
export const useTaskShortcuts = (handlers) => {
  const shortcuts = [
    {
      key: 'ctrl+n',
      action: handlers.createTask,
      description: 'Create new task'
    },
    {
      key: 'ctrl+s',
      action: handlers.saveTask,
      description: 'Save current task'
    },
    {
      key: 'escape',
      action: handlers.cancelEdit,
      description: 'Cancel editing'
    },
    {
      key: 'ctrl+f',
      action: handlers.focusSearch,
      description: 'Focus search'
    },
    {
      key: 'ctrl+1',
      action: () => handlers.filterTasks('all'),
      description: 'Show all tasks'
    },
    {
      key: 'ctrl+2',
      action: () => handlers.filterTasks('pending'),
      description: 'Show pending tasks'
    },
    {
      key: 'ctrl+3',
      action: () => handlers.filterTasks('completed'),
      description: 'Show completed tasks'
    }
  ];

  useKeyboardShortcuts(shortcuts);
};

// Keyboard shortcuts for project management
export const useProjectShortcuts = (handlers) => {
  const shortcuts = [
    {
      key: 'ctrl+shift+n',
      action: handlers.createProject,
      description: 'Create new project'
    },
    {
      key: 'ctrl+g',
      action: handlers.goToDashboard,
      description: 'Go to dashboard'
    }
  ];

  useKeyboardShortcuts(shortcuts);
};
