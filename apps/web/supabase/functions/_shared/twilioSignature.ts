/**
 * Validates Twilio webhook X-Twilio-Signature per
 * https://www.twilio.com/docs/usage/security#validating-requests
 * Uses the primary Account Auth Token (TWILIO_AUTH_TOKEN), not API Key Secret.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

function paramsFromFormBody(bodyText: string): Record<string, string> {
  const params = new URLSearchParams(bodyText)
  const out: Record<string, string> = {}
  for (const [k, v] of params.entries()) {
    out[k] = v
  }
  return out
}

export async function validateTwilioRequestSignature(
  fullUrl: string,
  bodyText: string,
  signatureHeader: string | null,
  authToken: string,
): Promise<boolean> {
  if (!signatureHeader || !authToken) return false
  const params = paramsFromFormBody(bodyText)
  const sortedKeys = Object.keys(params).sort()
  let data = fullUrl
  for (const key of sortedKeys) {
    data += key + params[key]
  }
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
  return timingSafeEqual(expected, signatureHeader)
}

/** Prefer TWILIO_WEBHOOK_PUBLIC_URL (no trailing slash) if Request.url host differs from Twilio-signed URL. */
export function resolveTwilioWebhookFullUrl(req: Request): string {
  const override = (Deno.env.get('TWILIO_WEBHOOK_PUBLIC_URL') || '').trim().replace(/\/+$/, '')
  if (override) {
    const path = new URL(req.url).pathname + new URL(req.url).search
    return `${override}${path}`
  }
  return new URL(req.url).href
}
