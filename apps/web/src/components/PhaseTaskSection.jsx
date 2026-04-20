import React, { useCallback, useEffect, useState } from 'react';

const storageKey = (projectId, phaseKey) => `siteweave.phaseCollapse.${projectId}.${phaseKey}`;

function PhaseTaskSection({
    projectId,
    phaseKey,
    phaseId = null,
    title,
    progressPercent,
    defaultExpanded = true,
    onTaskDrop,
    children,
}) {
    const [expanded, setExpanded] = useState(() => {
        if (typeof window === 'undefined') return defaultExpanded;
        try {
            const raw = window.localStorage.getItem(storageKey(projectId, phaseKey));
            if (raw === '0') return false;
            if (raw === '1') return true;
        } catch {
            // Ignore localStorage failures.
        }
        return defaultExpanded;
    });
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey(projectId, phaseKey), expanded ? '1' : '0');
        } catch {
            // Ignore localStorage failures.
        }
    }, [projectId, phaseKey, expanded]);

    const toggle = useCallback(() => {
        setExpanded((current) => !current);
    }, []);

    const pct = Math.max(0, Math.min(100, Math.round(Number(progressPercent) || 0)));

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId && onTaskDrop) onTaskDrop(taskId, phaseId);
    };

    return (
        <section
            className={`rounded-lg border overflow-hidden bg-white transition-all duration-150 ${
                isDragOver ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-gray-200'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <button
                type="button"
                onClick={toggle}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 text-left transition-colors ${
                    isDragOver ? 'bg-blue-50' : 'bg-gray-100 hover:bg-gray-200/80'
                }`}
            >
                <span className="text-gray-600 w-5 shrink-0" aria-hidden>
                    {expanded ? '▼' : '▶'}
                </span>
                <span className="font-semibold text-gray-900 flex-1 min-w-0 ui-ellipsis-1">{title}</span>
                <div className="h-2 w-28 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                    <div className="h-2 bg-blue-600 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-bold text-gray-900 shrink-0">{pct}%</span>
            </button>
            {expanded && <div className="divide-y divide-gray-100">{children}</div>}
        </section>
    );
}

export default PhaseTaskSection;
