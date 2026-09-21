#!/usr/bin/env node
/**
 * P3 Lending Protocol - Local Authentication Server
 * Simple Express server for user registration and login
 * Works with local PostgreSQL database
 */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-in-production';

// PostgreSQL connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'p3lending',
  user: process.env.POSTGRES_USER || 'p3user',
  password: process.env.POSTGRES_PASSWORD || 'p3password',
});

// Email transporter (Mailhog for local development)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 1025,
  secure: false,
  ignoreTLS: true,
});

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/db-status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'connected',
      database: 'p3lending',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // Check if user is admin (p3lending.space domain)
    const isAdmin = email.toLowerCase().endsWith('@p3lending.space');
    const userRole = isAdmin ? 'admin' : 'authenticated';

    // Insert user
    const result = await pool.query(
      `INSERT INTO auth.users (
        email,
        encrypted_password,
        confirmation_token,
        confirmation_sent_at,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, NOW(), $4, NOW(), NOW()) RETURNING id, email`,
      [
        email.toLowerCase(),
        hashedPassword,
        confirmationToken,
        JSON.stringify({ full_name: full_name || '', role: userRole })
      ]
    );

    const user = result.rows[0];

    // Send confirmation email
    const baseUrl = process.env.FRONTEND_URL || 'https://p3lending.space';
    const mailhogUrl = process.env.MAILHOG_URL || 'https://mail.p3lending.space';

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@p3lending.local',
        to: email,
        subject: 'Welcome to P3 Lending - Confirm Your Email',
        html: `
          <h1>Welcome to P3 Lending!</h1>
          <p>Thank you for registering. Please confirm your email by clicking the link below:</p>
          <p><a href="${baseUrl}/confirm-email?token=${confirmationToken}">Confirm Email</a></p>
          <p>Or use this token: ${confirmationToken}</p>
          <p><small>View this email in Mailhog (development): <a href="${mailhogUrl}">${mailhogUrl}</a></small></p>
        `
      });
      console.log(`📧 Confirmation email sent to ${email}`);
    } catch (emailError) {
      console.error('Email error:', emailError.message);
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: userRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
      },
      token,
      message: 'Registration successful. Please check your email (Mailhog) for confirmation.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, encrypted_password, email_confirmed_at, raw_user_meta_data FROM auth.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.encrypted_password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last sign in
    await pool.query(
      'UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Check if user is admin (p3lending.space domain)
    const isAdmin = user.email.toLowerCase().endsWith('@p3lending.space');
    const userRole = isAdmin ? 'admin' : 'authenticated';

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: userRole,
        user_metadata: user.raw_user_meta_data
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        role: userRole,
        user_metadata: user.raw_user_meta_data
      },
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Confirm email
app.post('/api/auth/confirm-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE auth.users
       SET email_confirmed_at = NOW(),
           confirmed_at = NOW(),
           confirmation_token = NULL
       WHERE confirmation_token = $1
       RETURNING id, email`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.json({
      message: 'Email confirmed successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({ error: 'Confirmation failed', details: error.message });
  }
});

// Get current user
app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, email_confirmed_at, raw_user_meta_data, created_at FROM auth.users WHERE id = $1',
      [req.user.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// List all users (for debugging)
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 P3 Lending Local Auth Server');
  console.log('================================');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`✅ Database: postgresql://localhost:5432/p3lending`);
  console.log(`✅ Mailhog UI: http://localhost:8025`);
  console.log('');
  console.log('API Endpoints:');
  console.log(`  POST   http://localhost:${PORT}/api/auth/register`);
  console.log(`  POST   http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST   http://localhost:${PORT}/api/auth/confirm-email`);
  console.log(`  GET    http://localhost:${PORT}/api/auth/user`);
  console.log(`  GET    http://localhost:${PORT}/api/debug/users`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
