import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize a free-text phone for assignee lookup (E.164).
 * @param {string} raw
 * @param {{ defaultRegion?: string }} [options]
 * @returns {{ e164: string | null, isValid: boolean }}
 */
export function normalizeAssigneePhone(raw, options = {}) {
    const defaultRegion = options.defaultRegion ?? 'US';
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return { e164: null, isValid: false };
    }
    const parsed = parsePhoneNumberFromString(trimmed, defaultRegion);
    if (!parsed || !parsed.isValid()) {
        return { e164: null, isValid: false };
    }
    return { e164: parsed.format('E.164'), isValid: true };
}
