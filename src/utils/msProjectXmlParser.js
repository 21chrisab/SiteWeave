/**
 * Microsoft Project XML → neutral rows + discovered field keys (namespace-aware).
 * Does not assign SiteWeave semantics; mapping is applied separately.
 */

export const MSP_NS = 'http://schemas.microsoft.com/project';

const SKIP_TASK_CHILD_TAGS = new Set([
    'PredecessorLink',
    'ExtendedAttribute',
    'TimephasedData',
]);

/**
 * @param {string} xmlText
 * @returns {{ error?: string, project?: object }}
 */
export function parseMsProjectXml(xmlText) {
    if (typeof DOMParser === 'undefined') {
        return { error: 'XML parsing is not available in this environment' };
    }
    let doc;
    try {
        doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    } catch (e) {
        return { error: e?.message || 'Invalid XML' };
    }
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) {
        return { error: 'Could not parse XML' };
    }

    const projectEl =
        doc.getElementsByTagNameNS(MSP_NS, 'Project')[0] ||
        doc.getElementsByTagName('Project')[0];
    if (!projectEl) {
        return { error: 'No Project root element found' };
    }

    const minutesPerDay = parseInt(textChild(projectEl, 'MinutesPerDay', MSP_NS), 10) || 480;

    const title = textChild(projectEl, 'Title', MSP_NS) || textChild(projectEl, 'Name', MSP_NS) || null;

    const extendedDefs = [];
    const extRoot =
        projectEl.getElementsByTagNameNS(MSP_NS, 'ExtendedAttributes')[0] ||
        projectEl.getElementsByTagName('ExtendedAttributes')[0];
    if (extRoot) {
        const attrs = extRoot.getElementsByTagNameNS(MSP_NS, 'ExtendedAttribute');
        for (let i = 0; i < attrs.length; i++) {
            const a = attrs[i];
            const fieldId = textChild(a, 'FieldID', MSP_NS);
            const fieldName = textChild(a, 'FieldName', MSP_NS);
            const alias = textChild(a, 'Alias', MSP_NS);
            if (fieldId) {
                extendedDefs.push({
                    key: `ext:${fieldId}`,
                    fieldId,
                    fieldName: fieldName || null,
                    alias: alias || null,
                    label: [alias, fieldName, `Field ${fieldId}`].filter(Boolean).join(' — '),
                });
            }
        }
    }

    const taskEls = projectEl.getElementsByTagNameNS(MSP_NS, 'Task');
    const rows = [];
    const fieldKeySet = new Set();
    const sampleValues = new Map();

    for (let i = 0; i < taskEls.length; i++) {
        const taskEl = taskEls[i];
        const parsed = parseTaskElement(taskEl, MSP_NS, minutesPerDay);
        if (!parsed) continue;
        rows.push(parsed);
        Object.entries(parsed.fields).forEach(([k, v]) => {
            fieldKeySet.add(k);
            pushSampleValue(sampleValues, k, v);
        });
        parsed.extended.forEach((value, fk) => {
            fieldKeySet.add(fk);
            pushSampleValue(sampleValues, fk, value);
        });
        if (parsed.predecessorLinks.length > 0) {
            fieldKeySet.add('meta:predecessor_links');
            pushSampleValue(
                sampleValues,
                'meta:predecessor_links',
                parsed.predecessorLinks.map((link) => link.predecessorUid).join(', ')
            );
        }
    }

    const discoveredFields = Array.from(fieldKeySet)
        .sort()
        .map((key) => {
            const extDef = extendedDefs.find((d) => d.key === key);
            return {
                key,
                label: extDef?.label || key.replace(/^el:/, '').replace(/^ext:/, 'Extended '),
                samples: sampleValues.get(key) || [],
            };
        });

    return {
        project: {
            title,
            minutesPerDay,
            extendedAttributeDefinitions: extendedDefs,
            discoveredFields,
            rows,
        },
    };
}

/**
 * @param {Element} taskEl
 * @param {string} ns
 * @param {number} minutesPerDay
 */
function parseTaskElement(taskEl, ns, minutesPerDay) {
    const uid = textChild(taskEl, 'UID', ns);
    if (uid === '' || uid === undefined) return null;

    const isNull = textChild(taskEl, 'IsNull', ns);
    if (isNull === '1') return null;

    const active = textChild(taskEl, 'Active', ns);
    if (active === '0') return null;

    /** @type {Record<string, string>} */
    const fields = {};

    for (let c = taskEl.firstElementChild; c; c = c.nextElementSibling) {
        const local = c.localName || c.nodeName.replace(/^.*:/, '');
        if (SKIP_TASK_CHILD_TAGS.has(local)) continue;
        if (c.children && c.children.length > 0) continue;
        const v = (c.textContent || '').trim();
        if (v === '') continue;
        const fk = `el:${local}`;
        fields[fk] = v;
    }

    const extended = new Map();
    const extNodes = taskEl.getElementsByTagNameNS(ns, 'ExtendedAttribute');
    for (let i = 0; i < extNodes.length; i++) {
        const node = extNodes[i];
        if (node.parentNode !== taskEl) continue;
        const fieldId = textChild(node, 'FieldID', ns);
        const value = textChild(node, 'Value', ns);
        if (fieldId) {
            extended.set(`ext:${fieldId}`, value);
        }
    }

    const predecessorLinks = [];
    const predNodes = taskEl.getElementsByTagNameNS(ns, 'PredecessorLink');
    for (let i = 0; i < predNodes.length; i++) {
        const p = predNodes[i];
        if (p.parentNode !== taskEl) continue;
        const predUid = textChild(p, 'PredecessorUID', ns);
        const type = textChild(p, 'Type', ns);
        const linkLag = textChild(p, 'LinkLag', ns);
        const lagFormat = textChild(p, 'LagFormat', ns);
        if (predUid !== '') {
            predecessorLinks.push({
                predecessorUid: predUid,
                type: type === '' ? '1' : type,
                linkLag: linkLag === '' ? '0' : linkLag,
                lagFormat: lagFormat === '' ? '7' : lagFormat,
            });
        }
    }

    const durationIso = fields['el:Duration'] || '';
    const startRaw = fields['el:Start'] || '';
    const finishRaw = fields['el:Finish'] || '';
    const durationDaysComputed = computeDurationDays(durationIso, startRaw, finishRaw, minutesPerDay);
    if (durationDaysComputed != null) {
        fields['__computed:duration_days'] = String(durationDaysComputed);
    }

    return {
        uid,
        fields,
        extended,
        predecessorLinks,
    };
}

function pushSampleValue(sampleValues, key, value) {
    if (value == null || value === '') return;
    const list = sampleValues.get(key) || [];
    if (!list.includes(value)) {
        list.push(value);
    }
    sampleValues.set(key, list.slice(0, 3));
}

function textChild(parent, localName, ns) {
    const els = parent.getElementsByTagNameNS(ns, localName);
    if (els.length === 0) return '';
    return (els[0].textContent || '').trim();
}

/**
 * Parse ISO 8601 duration PT#H#M#S or calendar span from start/finish.
 * @returns {number | null}
 */
export function computeDurationDays(durationIso, startRaw, finishRaw, minutesPerDay) {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(durationIso || '');
    if (m) {
        const h = parseInt(m[1] || '0', 10) || 0;
        const min = parseInt(m[2] || '0', 10) || 0;
        const sec = parseFloat(m[3] || '0') || 0;
        const totalMinutes = h * 60 + min + sec / 60;
        if (totalMinutes <= 0) return null;
        const days = totalMinutes / minutesPerDay;
        return Math.max(1, Math.round(days * 100) / 100);
    }
    const s = parseMsDate(startRaw);
    const f = parseMsDate(finishRaw);
    if (s && f) {
        const ms = f.getTime() - s.getTime();
        const wholeDays = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        return wholeDays;
    }
    return null;
}

/**
 * @param {string} raw
 * @returns {Date | null}
 */
export function parseMsDate(raw) {
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string} raw YYYY-MM-DD
 */
export function toDateOnly(raw) {
    if (!raw) return null;
    const d = parseMsDate(raw);
    if (!d) return null;
    return d.toISOString().slice(0, 10);
}
