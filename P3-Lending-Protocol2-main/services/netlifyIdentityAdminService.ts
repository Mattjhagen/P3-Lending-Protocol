import { AuthService } from './netlifyAuth';

export type NetlifyInviteStatus = 'INVITED' | 'ALREADY_EXISTS' | 'FAILED';

export interface NetlifyIdentityUser {
  id: string;
  email: string;
  created_at: string | null;
  invited_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  role: string | null;
  banned_until: string | null;
  app_metadata: Record<string, unknown> | null;
  user_metadata: Record<string, unknown> | null;
}

export interface NetlifyIdentitySummary {
  total_users: number;
  pending_invites: number;
  active_users: number;
}

export interface NetlifyIdentityListResponse {
  users: NetlifyIdentityUser[];
  invites: NetlifyIdentityUser[];
  summary: NetlifyIdentitySummary;
}

export interface NetlifyInviteResult {
  email: string;
  status: NetlifyInviteStatus;
  id?: string | null;
  invited_at?: string | null;
  error?: string | null;
}

export interface NetlifyInviteResponse {
  invited_count: number;
  already_exists_count: number;
  failed_count: number;
  results: NetlifyInviteResult[];
}

const parseErrorMessage = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    return 'Netlify admin request failed.';
  }

  const body = payload as Record<string, unknown>;
  if (typeof body.error === 'string') {
    return body.error;
  }
  if (typeof body.message === 'string') {
    return body.message;
  }

  return 'Netlify admin request failed.';
};

const getAuthToken = async (): Promise<string> => {
  const currentUser = AuthService.currentUser();
  const identityUser = currentUser as any;

  if (!currentUser) {
    throw new Error('No authenticated Netlify user session found.');
  }

  if (typeof identityUser.jwt === 'function') {
    const token = await identityUser.jwt();
    if (token) {
      return token;
    }
  }

  const fallback = identityUser.token?.access_token || identityUser.token?.accessToken;
  if (fallback) {
    return fallback;
  }

  throw new Error('Unable to acquire Netlify access token.');
};

const requestAdminApi = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = await getAuthToken();

  const response = await fetch(`/.netlify/functions/netlify-identity-admin${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    throw new Error(parseErrorMessage(payload));
  }

  return payload as T;
};

export const NetlifyIdentityAdminService = {
  listUsers: async (): Promise<NetlifyIdentityListResponse> => {
    const payload = await requestAdminApi<{
      users: NetlifyIdentityUser[];
      invites: NetlifyIdentityUser[];
      summary: NetlifyIdentitySummary;
    }>('', { method: 'GET' });

    return {
      users: payload.users || [],
      invites: payload.invites || [],
      summary: payload.summary || {
        total_users: 0,
        pending_invites: 0,
        active_users: 0,
      },
    };
  },

  inviteUsers: async (emails: string[]): Promise<NetlifyInviteResponse> => {
    const normalized = emails.map((email) => email.trim().toLowerCase()).filter(Boolean);

    if (normalized.length === 0) {
      return {
        invited_count: 0,
        already_exists_count: 0,
        failed_count: 0,
        results: [],
      };
    }

    const payload = await requestAdminApi<NetlifyInviteResponse>('', {
      method: 'POST',
      body: JSON.stringify({ emails: normalized }),
    });

    return {
      invited_count: payload.invited_count || 0,
      already_exists_count: payload.already_exists_count || 0,
      failed_count: payload.failed_count || 0,
      results: payload.results || [],
    };
  },
};
