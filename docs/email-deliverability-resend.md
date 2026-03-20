# Email deliverability (Resend, SPF, DKIM, DMARC)

Progress reports (and other mail) are sent through **Resend**. Inboxes such as Gmail, Yahoo, and Microsoft increasingly require **aligned authentication** for bulk or business mail.

## What to configure

1. **Domain in Resend**  
   Add and verify your sending domain in the [Resend dashboard](https://resend.com/docs/dashboard/domains/introduction). Use addresses on that domain in production (not a generic shared domain you don’t control).

2. **DNS records** (at your DNS host, for the domain you send *from*)  
   - **SPF** — Resend provides a TXT record authorizing their servers to send as your domain.  
   - **DKIM** — Resend provides DKIM keys so receivers can verify message integrity.  
   - **DMARC** — Add a **TXT** record at `_dmarc.yourdomain.com` (e.g. `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`) to start, then tighten policy (`quarantine` / `reject`) once SPF/DKIM pass consistently.

3. **“From” address in SiteWeave**  
   Set the Edge Function secret **`RESEND_FROM`** to a verified sender, for example:  
   `SiteWeave Reports <reports@yourdomain.com>`  
   If unset, the function falls back to a default address (which may not match your verified domain).

4. **`RESEND_API_KEY`**  
   Must be set for the `send-progress-report` function; scope it appropriately in Resend.

## Why DMARC shows up in warnings

A **DMARC** record tells receivers what to do when mail **fails** SPF or DKIM. Large providers often **require** a valid DMARC record for high-volume or stricter paths. Without SPF/DKIM alignment for your From domain, messages may land in spam or be rejected.

## Further reading

- [Resend: Domain verification](https://resend.com/docs/dashboard/domains/introduction)  
- [DMARC overview (DMARC.org)](https://dmarc.org/)
