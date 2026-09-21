-- Create auth schema for local PostgreSQL (mimics Supabase auth)
CREATE SCHEMA IF NOT EXISTS auth;

-- Users table (main authentication table)
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE,
    confirmation_token VARCHAR(255),
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    recovery_token VARCHAR(255),
    recovery_sent_at TIMESTAMP WITH TIME ZONE,
    email_change_token_new VARCHAR(255),
    email_change VARCHAR(255),
    email_change_sent_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(15),
    phone_confirmed_at TIMESTAMP WITH TIME ZONE,
    phone_change VARCHAR(15),
    phone_change_token VARCHAR(255),
    phone_change_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    email_change_token_current VARCHAR(255),
    email_change_confirm_status SMALLINT DEFAULT 0,
    banned_until TIMESTAMP WITH TIME ZONE,
    reauthentication_token VARCHAR(255),
    reauthentication_sent_at TIMESTAMP WITH TIME ZONE,
    is_sso_user BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factor_id UUID,
    aal VARCHAR(10),
    not_after TIMESTAMP WITH TIME ZONE,
    refreshed_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip INET,
    tag TEXT
);

-- Helper function to get current user ID (returns NULL in standalone PostgreSQL)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('request.jwt.claim.sub', TRUE)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.jwt.claim.role', TRUE)::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'anon';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is authenticated
CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.jwt.claim.email', TRUE)::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Identities table (for OAuth providers)
CREATE TABLE IF NOT EXISTS auth.identities (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data JSONB NOT NULL,
    provider TEXT NOT NULL,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT,
    PRIMARY KEY (provider, id)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id UUID,
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE,
    user_id VARCHAR(255),
    revoked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent VARCHAR(255),
    session_id UUID REFERENCES auth.sessions(id) ON DELETE CASCADE
);

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT SELECT ON auth.users TO PUBLIC;
GRANT SELECT ON auth.sessions TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC;

COMMENT ON SCHEMA auth IS 'Local PostgreSQL auth schema mimicking Supabase auth';
