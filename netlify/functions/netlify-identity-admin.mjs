const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 25;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const parseCsv = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const normalizeOrigin = (event) => {
  const host = event.headers.host || event.headers.Host;
  const proto = event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || 'https';

  if (!host) {
    return null;
  }

  return `${proto}://${host}`;
};

const getIdentityBaseUrl = (event) => {
  const configured = (process.env.NETLIFY_IDENTITY_URL || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const origin = normalizeOrigin(event);
  if (!origin) {
    return null;
  }

  return `${origin}/.netlify/identity`;
};

const getBearerToken = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const isAllowedAdmin = (identityUser) => {
  const email = (identityUser?.email || '').toLowerCase();
  if (!email) {
    return false;
  }

  const explicitEmails = parseCsv(process.env.NETLIFY_ADMIN_ALLOWED_EMAILS);
  const allowedDomains = parseCsv(process.env.NETLIFY_ADMIN_ALLOWED_EMAIL_DOMAINS || 'p3lending.space');

  if (explicitEmails.length > 0 && explicitEmails.includes(email)) {
    return true;
  }

  const [, domain = ''] = email.split('@');
  return allowedDomains.includes(domain.toLowerCase());
};

const fetchJson = async (url, options) => {
  const result = await fetch(url, options);
  const raw = await result.text();

  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (_err) {
    parsed = raw || null;
  }

  if (!result.ok) {
    const error = new Error(`Request failed with status ${result.status}`);
    error.status = result.status;
    error.details = parsed;
    throw error;
  }

  return parsed;
};

const verifyCaller = async (identityBaseUrl, bearerToken) => {
  const user = await fetchJson(`${identityBaseUrl}/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!isAllowedAdmin(user)) {
    const error = new Error('Admin access denied.');
    error.status = 403;
    throw error;
  }

  return user;
};

const createIdentityAdminClient = (identityBaseUrl, adminToken) => {
  const request = (path, init = {}) => {
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    };

    return fetchJson(`${identityBaseUrl}${path}`, {
      method: init.method || 'GET',
      headers,
      body: init.body,
    });
  };

  return {
    listUsers: async () => {
      const all = [];

      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const payload = await request(`/admin/users?page=${page}&per_page=${MAX_PAGE_SIZE}`);
        const users = Array.isArray(payload) ? payload : Array.isArray(payload?.users) ? payload.users : [];

        all.push(...users);

        if (users.length < MAX_PAGE_SIZE) {
          break;
        }
      }

      return all;
    },
    inviteUser: async (email) => {
      try {
        return await request('/invite', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
      } catch (error) {
        if (error.status !== 404 && error.status !== 405) {
          throw error;
        }

        return request('/admin/users', {
          method: 'POST',
          body: JSON.stringify({ email, invite: true }),
        });
      }
    },
  };
};

const sanitizeIdentityUser = (user) => ({
  id: user.id,
  email: user.email,
  created_at: user.created_at || null,
  invited_at: user.invited_at || null,
  confirmed_at: user.confirmed_at || null,
  last_sign_in_at: user.last_sign_in_at || null,
  role: user.role || null,
  banned_until: user.banned_until || null,
  app_metadata: user.app_metadata || null,
  user_metadata: user.user_metadata || null,
});

const inviteStatusFromError = (error) => {
  const code = error?.details?.code || error?.details?.error_code;
  const message = (error?.details?.msg || error?.details?.error || error?.message || '').toString().toLowerCase();

  if (
    error?.status === 409 ||
    error?.status === 422 ||
    code === 'email_exists' ||
    code === 'identity_already_exists' ||
    message.includes('already')
  ) {
    return 'ALREADY_EXISTS';
  }

  return 'FAILED';
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, { ok: true });
  }

  const adminToken = (process.env.NETLIFY_IDENTITY_ADMIN_TOKEN || '').trim();
  const identityBaseUrl = getIdentityBaseUrl(event);

  const missingConfig = [];
  if (!adminToken) {
    missingConfig.push('NETLIFY_IDENTITY_ADMIN_TOKEN');
  }
  if (!identityBaseUrl) {
    missingConfig.push('NETLIFY_IDENTITY_URL or valid host headers');
  }

  if (missingConfig.length > 0) {
    return response(500, {
      ok: false,
      error: 'Missing Netlify Identity admin configuration.',
      missing: missingConfig,
    });
  }

  const bearerToken = getBearerToken(event);
  if (!bearerToken) {
    return response(401, {
      ok: false,
      error: 'Missing bearer token.',
    });
  }

  try {
    await verifyCaller(identityBaseUrl, bearerToken);
  } catch (error) {
    return response(error.status || 401, {
      ok: false,
      error: error.message || 'Unauthorized',
    });
  }

  const identityAdmin = createIdentityAdminClient(identityBaseUrl, adminToken);

  if (event.httpMethod === 'GET') {
    try {
      const rawUsers = await identityAdmin.listUsers();
      const users = rawUsers.map(sanitizeIdentityUser);
      const invites = users.filter((user) => Boolean(user.invited_at) && !user.last_sign_in_at);

      return response(200, {
        ok: true,
        users,
        invites,
        summary: {
          total_users: users.length,
          pending_invites: invites.length,
          active_users: users.length - invites.length,
        },
      });
    } catch (error) {
      return response(error.status || 500, {
        ok: false,
        error: 'Failed to fetch Netlify Identity users.',
        details: typeof error.details === 'string' ? error.details : undefined,
      });
    }
  }

  if (event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (_err) {
      return response(400, {
        ok: false,
        error: 'Invalid JSON payload.',
      });
    }

    const emails = Array.isArray(payload.emails)
      ? payload.emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
      : [];

    if (emails.length === 0) {
      return response(400, {
        ok: false,
        error: 'Payload must include at least one email.',
      });
    }

    const uniqueEmails = Array.from(new Set(emails));
    const results = [];

    for (const email of uniqueEmails) {
      try {
        const invited = await identityAdmin.inviteUser(email);
        results.push({
          email,
          status: 'INVITED',
          id: invited?.id || null,
          invited_at: invited?.invited_at || null,
        });
      } catch (error) {
        const status = inviteStatusFromError(error);
        results.push({
          email,
          status,
          error: status === 'FAILED' ? error?.details?.msg || error?.message || 'Invite failed.' : null,
        });
      }
    }

    const invitedCount = results.filter((row) => row.status === 'INVITED').length;
    const alreadyCount = results.filter((row) => row.status === 'ALREADY_EXISTS').length;
    const failedCount = results.filter((row) => row.status === 'FAILED').length;

    return response(200, {
      ok: true,
      invited_count: invitedCount,
      already_exists_count: alreadyCount,
      failed_count: failedCount,
      results,
    });
  }

  return response(405, {
    ok: false,
    error: 'Method not allowed.',
  });
};
