import nodemailer from 'nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const sanitizeText = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();

const safeErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
};

const requireEnv = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing ${name} configuration`);
  }
  return value;
};

const insertSupabaseRow = async (supabaseUrl, serviceRoleKey, table, payload) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.message === 'string' ? data.message : `Supabase insert failed for table ${table}`;
    throw new Error(detail);
  }

  return data;
};

const formatTranscript = (transcript) => {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return 'No transcript available.';
  }

  return transcript
    .slice(-20)
    .map((message) => {
      const sender = sanitizeText(message.senderName || message.senderId || 'Unknown');
      const text = sanitizeText(message.message || '');
      return `- ${sender}: ${text}`;
    })
    .join('\n');
};

const sendEscalationEmail = async ({
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpSecure,
  to,
  from,
  ticket,
  triggerMessage,
  transcript,
}) => {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: !smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const subject = `[P3] Support escalation ${ticket.id}`;
  const text = [
    'A customer support escalation was created.',
    '',
    `Ticket ID: ${ticket.id}`,
    `Subject: ${ticket.subject}`,
    `Priority: ${ticket.priority}`,
    `Customer: ${ticket.authorName} (${ticket.authorId})`,
    `Thread ID: ${ticket.threadId}`,
    `Trigger Message: ${sanitizeText(triggerMessage)}`,
    '',
    'Transcript:',
    formatTranscript(transcript),
  ].join('\n');

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_error) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON payload.' });
  }

  const userId = sanitizeText(payload.userId);
  const userName = sanitizeText(payload.userName || 'Customer');
  const threadId = sanitizeText(payload.threadId || userId);
  const triggerMessage = sanitizeText(payload.triggerMessage || 'Customer requested live support');
  const aiResponse = sanitizeText(payload.aiResponse || 'AI assistant could not resolve issue');
  const category = sanitizeText(payload.category || 'support');
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];

  if (!userId || !threadId) {
    return jsonResponse(400, { ok: false, error: 'Missing required escalation fields.' });
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    const now = Date.now();
    const ticketId = `tick_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const ticketData = {
      id: ticketId,
      authorId: userId,
      authorName: userName,
      subject: `Escalation: ${category} (${userName})`,
      description: `${triggerMessage}\n\nAI Context: ${aiResponse}`,
      priority: 'HIGH',
      status: 'OPEN',
      createdAt: now,
      threadId,
      transcript: transcript.slice(-20),
    };

    await insertSupabaseRow(supabaseUrl, supabaseServiceRoleKey, 'internal_tickets', {
      id: ticketId,
      status: 'OPEN',
      data: ticketData,
    });

    const chatMessage = {
      id: `msg_${now}_${Math.random().toString(36).slice(2, 8)}`,
      senderId: 'system_root',
      senderName: 'System Root',
      role: 'ADMIN',
      message: `Support escalation created (${ticketId}) for ${userName}.`,
      timestamp: now,
      type: 'CUSTOMER_SUPPORT',
      threadId,
    };

    await insertSupabaseRow(supabaseUrl, supabaseServiceRoleKey, 'chats', {
      id: chatMessage.id,
      thread_id: threadId,
      sender_id: chatMessage.senderId,
      message: chatMessage.message,
      type: chatMessage.type,
      data: chatMessage,
    });

    let emailSent = false;
    try {
      const smtpHost = (process.env.SMTP_HOST || 'smtp.protonmail.ch').trim();
      const smtpPort = Number(process.env.SMTP_PORT || '587');
      const smtpUser = requireEnv('SMTP_USER');
      const smtpPass = requireEnv('SMTP_PASS');
      const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
      const to = (process.env.SUPPORT_ALERT_TO || 'admin@p3lending.space').trim();
      const from = (process.env.SUPPORT_ALERT_FROM || smtpUser).trim();

      await sendEscalationEmail({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        to,
        from,
        ticket: ticketData,
        triggerMessage,
        transcript,
      });

      emailSent = true;
    } catch (emailError) {
      // Email failure should not prevent ticket/chat creation.
      console.warn('[support-escalation] email alert failed', safeErrorMessage(emailError));
    }

    return jsonResponse(200, {
      ok: true,
      ticketId,
      emailSent,
      escalatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: `Failed to escalate support request: ${safeErrorMessage(error)}`,
    });
  }
};
