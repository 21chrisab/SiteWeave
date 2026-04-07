import activityEn from '../i18n/activityEn.json';

/**
 * Minimal i18n-style `t` for activity lines (web app bundle has no react-i18next).
 * Keys match root app: `activity.xxx.yyy`.
 */
export function activityLineT(key, options = {}) {
  const path = key.replace(/^activity\./, '').split('.').filter(Boolean);
  let cur = activityEn;
  for (const p of path) {
    cur = cur?.[p];
  }
  let s = typeof cur === 'string' ? cur : key;
  Object.entries(options).forEach(([k, v]) => {
    s = s.split(`{{${k}}}`).join(v == null ? '' : String(v));
  });
  return s;
}
