/**
 * Supabase Edge Function : envoi de notification email
 *
 * Deploiement :
 *   supabase functions deploy send-notification
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY : cle API Resend (ou SendGrid)
 *   EMAIL_FROM : adresse email d'envoi
 *
 * Payload attendu :
 * {
 *   to: string,        // email du destinataire
 *   subject: string,
 *   html: string        // contenu HTML de l'email
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'planning@planningauto.fr';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { to, subject, html } = await req.json();

  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SIMULE] To: ${to}, Subject: ${subject}`);
    return new Response(
      JSON.stringify({ message: 'Email simulated (no RESEND_API_KEY configured)', to, subject }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to send email', details: data }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, id: data.id }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
