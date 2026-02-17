import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlifyIdentityAdminService } from '../../services/netlifyIdentityAdminService';
import { AuthService } from '../../services/netlifyAuth';

vi.mock('../../services/netlifyAuth', () => ({
  AuthService: {
    currentUser: vi.fn(),
  },
}));

describe('NetlifyIdentityAdminService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists users using the authenticated netlify token', async () => {
    vi.mocked(AuthService.currentUser).mockReturnValue({
      jwt: vi.fn().mockResolvedValue('token-123'),
    } as any);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        users: [{ id: 'u1', email: 'admin@p3lending.space' }],
        invites: [],
        summary: {
          total_users: 1,
          pending_invites: 0,
          active_users: 1,
        },
      }),
    } as any);

    const result = await NetlifyIdentityAdminService.listUsers();

    expect(fetchSpy).toHaveBeenCalledWith('/.netlify/functions/netlify-identity-admin', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));

    expect(result.summary.total_users).toBe(1);
    expect(result.users[0].email).toBe('admin@p3lending.space');
  });

  it('invites users and normalizes email casing', async () => {
    vi.mocked(AuthService.currentUser).mockReturnValue({
      jwt: vi.fn().mockResolvedValue('token-456'),
    } as any);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        invited_count: 1,
        already_exists_count: 0,
        failed_count: 0,
        results: [
          { email: 'test@example.com', status: 'INVITED' },
        ],
      }),
    } as any);

    const result = await NetlifyIdentityAdminService.inviteUsers(['  TEST@Example.com  ']);

    expect(fetchSpy).toHaveBeenCalledWith('/.netlify/functions/netlify-identity-admin', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ emails: ['test@example.com'] }),
    }));

    expect(result.invited_count).toBe(1);
    expect(result.results[0].status).toBe('INVITED');
  });

  it('throws a clean error when API response is not ok', async () => {
    vi.mocked(AuthService.currentUser).mockReturnValue({
      jwt: vi.fn().mockResolvedValue('token-789'),
    } as any);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'Admin access denied.',
      }),
    } as any);

    await expect(NetlifyIdentityAdminService.listUsers()).rejects.toThrow('Admin access denied.');
  });
});
