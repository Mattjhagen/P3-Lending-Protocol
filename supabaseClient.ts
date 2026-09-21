/**
 * Supabase Client - Local Auth Integration
 * Drop-in replacement that uses local authentication while maintaining the same API
 */
import { createLocalAuthCompatibleClient } from './services/authIntegration';

// Export a client that's compatible with Supabase API but uses local auth
export const supabase = createLocalAuthCompatibleClient();
