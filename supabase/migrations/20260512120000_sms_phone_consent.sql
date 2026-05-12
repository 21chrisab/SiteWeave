-- Global SMS consent per E.164 phone (reply YES / STOP inbound flow).
CREATE TABLE IF NOT EXISTS public.sms_phone_consent (
    phone_e164 text PRIMARY KEY,
    status text NOT NULL DEFAULT 'none'
        CHECK (status IN ('none', 'pending', 'confirmed', 'opted_out')),
    pending_token text,
    pending_organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
    pending_sent_at timestamptz,
    last_opt_in_sent_at timestamptz,
    last_opt_in_resend_at timestamptz,
    confirmed_at timestamptz,
    opted_out_at timestamptz,
    last_opt_in_message_sid text,
    last_confirm_inbound_sid text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sms_phone_consent_pending_token_uidx
    ON public.sms_phone_consent (pending_token)
    WHERE pending_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS sms_phone_consent_status_idx
    ON public.sms_phone_consent (status);

ALTER TABLE public.sms_phone_consent ENABLE ROW LEVEL SECURITY;

-- Authenticated clients can read consent rows (for UI gating). Writes only via service role / Edge Functions.
CREATE POLICY "sms_phone_consent_select_authenticated"
    ON public.sms_phone_consent
    FOR SELECT
    TO authenticated
    USING (true);

GRANT SELECT ON TABLE public.sms_phone_consent TO authenticated;
GRANT ALL ON TABLE public.sms_phone_consent TO service_role;

COMMENT ON TABLE public.sms_phone_consent IS 'Twilio SMS double opt-in: one row per E.164; status drives substantive SMS sends.';
