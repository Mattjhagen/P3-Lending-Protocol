# P3 Lending - Local Authentication Guide

## ✅ Issue Resolved!

The Supabase environment validation error has been fixed. The system now uses **local authentication** instead of Supabase.

---

## 🌐 Access URLs

### Main Website
- **Network Access:** http://192.168.0.169:5173/
- **Localhost:** http://localhost:5173/

### **NEW: Authentication Test Page** 🎯
- **http://192.168.0.169:5173/test-auth.html**
- **http://localhost:5173/test-auth.html**

This is a beautiful standalone page where you can:
- ✅ Register new users
- ✅ Login with credentials
- ✅ View authentication status
- ✅ Test the auth system

### Services
- **Auth API:** http://localhost:5001
- **Email Testing (Mailhog):** http://localhost:8025
- **PostgreSQL:** localhost:5432

---

## 🧪 Quick Test - Create Your First User

### Option 1: Use the Test Page (Easiest)

1. **Open:** http://192.168.0.169:5173/test-auth.html
2. **Click "Register" tab**
3. **Fill in:**
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. **Click "Create Account"**
5. **Check emails:** http://localhost:8025
6. **Switch to "Login" tab** and sign in

### Option 2: Use curl

```bash
# Register a new user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@p3lending.local",
    "password": "SecurePass123!",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@p3lending.local",
    "password": "SecurePass123!"
  }'
```

---

## 🔧 What Changed

### Before (Broken)
```
❌ VITE_SUPABASE_URL: Required external Supabase service
❌ VITE_SUPABASE_ANON_KEY: Required 20+ character key
❌ Supabase client trying to connect to cloud
```

### After (Working)
```
✅ Local PostgreSQL database (Docker)
✅ Local Express auth API
✅ Local email server (Mailhog)
✅ JWT token-based authentication
✅ All services running on your server
```

---

## 📝 Environment Variables (Updated)

Your `.env` file now contains:

```env
# Frontend - Local Auth
VITE_SUPABASE_URL=http://localhost:5001
VITE_SUPABASE_ANON_KEY=local_development_anon_key_placeholder_20chars
VITE_BACKEND_URL=http://localhost:5001

# Local PostgreSQL
DATABASE_URL=postgresql://p3user:p3password@localhost:5432/p3lending
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=p3lending
POSTGRES_USER=p3user
POSTGRES_PASSWORD=p3password

# Local Email (Mailhog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@p3lending.local
```

---

## 🎯 How Authentication Works Now

### Registration Flow:
1. User submits email/password to `/api/auth/register`
2. Password is hashed with bcrypt
3. User record created in `auth.users` table
4. Confirmation email sent to Mailhog
5. JWT token returned for immediate login

### Login Flow:
1. User submits email/password to `/api/auth/login`
2. Password verified against hash in database
3. JWT token generated (expires in 24 hours)
4. Token stored in localStorage
5. Token used for authenticated API requests

### Email Confirmation:
1. Registration sends email with confirmation token
2. User clicks link or submits token to `/api/auth/confirm-email`
3. `email_confirmed_at` field updated in database

---

## 🔐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/confirm-email | Confirm email with token |
| GET | /api/auth/user | Get current user (requires Bearer token) |
| GET | /api/debug/users | List all users (debugging) |
| GET | /health | API health check |
| GET | /api/db-status | Database connection status |

---

## 🐳 Docker Services Running

```bash
# Check services
docker ps

# You should see:
# - p3-postgres (PostgreSQL database)
# - p3-mailhog (Email testing)

# View logs
docker logs p3-postgres
docker logs p3-mailhog

# Access PostgreSQL directly
docker exec -it p3-postgres psql -U p3user -d p3lending

# Query users
SELECT id, email, email_confirmed_at, created_at FROM auth.users;
```

---

## 🛡️ Security Testing Targets

Now that auth is working, you can test:

### 1. SQL Injection
```bash
# Test login endpoint
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"test"}'
```

### 2. XSS in Registration
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"xss@test.com","password":"test123","full_name":"<script>alert('\''XSS'\'')</script>"}'
```

### 3. JWT Token Security
```bash
# Get a valid token first
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' | jq -r '.token')

# Test with invalid token
curl http://localhost:5001/api/auth/user \
  -H "Authorization: Bearer invalid_token"

# Test with modified token
curl http://localhost:5001/api/auth/user \
  -H "Authorization: Bearer ${TOKEN}modified"
```

### 4. Password Brute Force
```bash
# Use Hydra for brute force testing
hydra -l test@test.com -P /usr/share/wordlists/rockyou.txt \
  localhost http-post-form \
  "/api/auth/login:email=^USER^&password=^PASS^:F=Invalid credentials"
```

### 5. Session Management
- Test if tokens expire properly (currently 24h)
- Test if old tokens are invalidated after logout
- Test concurrent sessions
- Test token refresh

---

## 📊 Database Schema

### auth.users table:
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique, indexed
- `encrypted_password` (VARCHAR) - bcrypt hash
- `email_confirmed_at` (TIMESTAMP)
- `confirmation_token` (VARCHAR)
- `last_sign_in_at` (TIMESTAMP)
- `raw_user_meta_data` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

Plus 30+ other tables from Supabase migrations for:
- Loan activity
- Waitlist management
- KYC sessions
- Audit logs
- Fraud detection
- And more...

---

## 🧪 Testing Checklist

- [ ] Register new user
- [ ] Check email in Mailhog
- [ ] Confirm email with token
- [ ] Login with credentials
- [ ] Test invalid credentials
- [ ] Test SQL injection
- [ ] Test XSS in inputs
- [ ] Test JWT token security
- [ ] Test password requirements
- [ ] Test rate limiting
- [ ] Test CORS configuration
- [ ] Test session timeout
- [ ] Test concurrent logins
- [ ] Database direct access

---

## 🚨 If You See Errors

### "Frontend environment validation failed"
✅ **Fixed!** The .env file now has valid values.

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart if needed
docker start p3-postgres
```

### "Cannot send email"
```bash
# Check if Mailhog is running
docker ps | grep mailhog

# Restart if needed
docker start p3-mailhog
```

### "Port already in use"
```bash
# Check what's using the ports
lsof -i :5001  # Auth API
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL
```

---

## 🎉 Success!

Your P3 Lending platform now has:
- ✅ Working local authentication
- ✅ No external dependencies
- ✅ Full database with 33 tables
- ✅ Email testing with Mailhog
- ✅ JWT-based security
- ✅ Beautiful test interface

**Start penetration testing!** 🛡️

---

## 📚 Next Steps

1. **Test authentication:** http://192.168.0.169:5173/test-auth.html
2. **View emails:** http://localhost:8025
3. **Run OWASP ZAP:** Target http://192.168.0.169:5173
4. **Test with Burp Suite:** Intercept auth requests
5. **SQL injection testing:** Use SQLMap on auth endpoints

Happy testing! 🚀
