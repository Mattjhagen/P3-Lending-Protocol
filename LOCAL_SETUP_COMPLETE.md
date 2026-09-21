# P3 Lending Protocol - Local Setup Complete! ✅

All services are running locally on your server. No external dependencies!

---

## 🌐 Access URLs

### P3 Lending Website
**From any device on your network:**
- **Primary:** http://192.168.0.169:5173/
- **Alternate:** http://192.168.0.30:5173/
- **Localhost:** http://localhost:5173/

### Authentication API
- **Base URL:** http://localhost:5001
- **Health Check:** http://localhost:5001/health
- **DB Status:** http://localhost:5001/api/db-status

### Email Testing (Mailhog)
- **Web UI:** http://localhost:8025
- All outgoing emails are captured here
- SMTP Port: 1025

### PostgreSQL Database
- **Host:** localhost
- **Port:** 5432
- **Database:** p3lending
- **User:** p3user
- **Password:** p3password
- **Connection:** `postgresql://p3user:p3password@localhost:5432/p3lending`

---

## 📝 API Endpoints

### Register New User
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Confirm Email
```bash
curl -X POST http://localhost:5001/api/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_CONFIRMATION_TOKEN"
  }'
```

### Get Current User (requires JWT token)
```bash
curl http://localhost:5001/api/auth/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Debug: List All Users
```bash
curl http://localhost:5001/api/debug/users
```

---

## 🧪 Testing User Registration & Login

### 1. Register a New User
Open your browser or use curl:

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@p3lending.local",
    "password": "SecurePassword123!",
    "full_name": "Test User"
  }'
```

Response will include:
- User ID
- JWT token
- Confirmation message

### 2. Check Email (Mailhog)
1. Open http://localhost:8025 in your browser
2. You'll see the confirmation email
3. Copy the confirmation token

### 3. Confirm Email
```bash
curl -X POST http://localhost:5001/api/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_FROM_EMAIL"
  }'
```

### 4. Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@p3lending.local",
    "password": "SecurePassword123!"
  }'
```

You'll receive a JWT token to use for authenticated requests.

---

## 🎯 Penetration Testing

Now you can start penetration testing with Kali Linux tools!

### Database Schema
All Supabase migrations have been applied. Tables include:
- `auth.users` - User authentication
- `auth.sessions` - User sessions  
- `public.loan_activity` - Loan records
- `public.waitlist` - Waitlist signups
- `public.admin_allowlist` - Admin users
- `public.kyc_sessions` - KYC verification
- And 20+ more tables...

### Test Targets

**1. Authentication System**
- Test SQL injection in login/registration
- Test weak password policies
- Test session management
- Test JWT token security

**2. API Endpoints**
```bash
# Try SQL injection
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"test"}'

# Try XSS in registration
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","full_name":"<script>alert('\''XSS'\'')</script>"}'
```

**3. Database Direct Access**
```bash
# Connect to PostgreSQL
docker exec -it p3-postgres psql -U p3user -d p3lending

# Query users
SELECT * FROM auth.users;

# Check for sensitive data
SELECT email, encrypted_password FROM auth.users LIMIT 5;
```

**4. Email System**
- Test for email injection
- Test SMTP relay abuse
- Check email header security

---

## 🛠️ Kali Linux Penetration Testing Tools

### OWASP ZAP
```bash
zaproxy
# Set target: http://192.168.0.169:5173
```

### Burp Suite
```bash
burpsuite
# Proxy: 127.0.0.1:8080
# Intercept requests to modify authentication
```

### SQLMap (Test API Endpoints)
```bash
# Test login endpoint
sqlmap -u "http://localhost:5001/api/auth/login" \
  --data='{"email":"test","password":"test"}' \
  --headers="Content-Type: application/json" \
  --batch
```

### Nmap Port Scan
```bash
nmap -sV -p 5001,5173,5432,8025 192.168.0.169
```

### Nikto Web Scanner
```bash
nikto -h http://192.168.0.169:5173
nikto -h http://localhost:5001
```

### Directory Brute Force
```bash
gobuster dir -u http://192.168.0.169:5173 \
  -w /usr/share/wordlists/dirb/common.txt
```

---

## 🐳 Docker Services Management

### Check Running Services
```bash
docker ps
```

### Stop Services
```bash
docker stop p3-postgres p3-mailhog
```

### Start Services
```bash
docker start p3-postgres p3-mailhog
```

### View Logs
```bash
docker logs p3-postgres
docker logs p3-mailhog
```

### Remove Services (when done testing)
```bash
docker rm -f p3-postgres p3-mailhog
```

---

## 📊 Database Tables Created

The following tables are available for testing:

| Schema | Table | Purpose |
|--------|-------|---------|
| auth | users | User authentication |
| auth | sessions | Active sessions |
| auth | identities | OAuth providers |
| public | loan_activity | Loan tracking |
| public | waitlist | Waitlist management |
| public | admin_allowlist | Admin permissions |
| public | kyc_sessions | KYC verification |
| public | audit_log | Audit trail |
| public | fraud_flags | Fraud detection |
| public | chats | Support chat |
| public | api_keys | Developer API keys |
| public | balances | User balances |
| public | ledger_transactions | Financial ledger |
| + 20 more... | | |

---

## 🧪 Quick Test Script

Create a test user and verify the system:

```bash
#!/bin/bash

echo "=== P3 Lending System Test ==="

# 1. Register user
echo "1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"pentester@local.test","password":"Test123456!","full_name":"Pen Tester"}')

echo "$REGISTER_RESPONSE" | jq .

# 2. Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
echo "Token: $TOKEN"

# 3. Check Mailhog
echo "2. Check email at: http://localhost:8025"

# 4. Login
echo "3. Testing login..."
curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pentester@local.test","password":"Test123456!"}' | jq .

# 5. List users
echo "4. Listing all users..."
curl -s http://localhost:5001/api/debug/users | jq .

echo "=== Test Complete ==="
```

---

## ✅ System Status

- ✅ **Frontend:** http://192.168.0.169:5173
- ✅ **Auth API:** http://localhost:5001
- ✅ **PostgreSQL:** localhost:5432 (33 tables)
- ✅ **Mailhog:** http://localhost:8025
- ✅ **Email SMTP:** localhost:1025

**Everything is running locally - no external services!**

---

## 🚨 Security Testing Checklist

- [ ] SQL Injection in login/registration
- [ ] XSS in user inputs
- [ ] Authentication bypass attempts
- [ ] JWT token manipulation
- [ ] Session hijacking
- [ ] Password brute force
- [ ] Email injection
- [ ] Authorization bypass (IDOR)
- [ ] API rate limiting
- [ ] Database direct access
- [ ] CSRF attacks
- [ ] CORS misconfiguration
- [ ] Information disclosure
- [ ] Default credentials

---

## 📚 Documentation References

- **PENTEST_GUIDE.md** - Comprehensive Kali tools reference
- **KALI_PENTEST_TUTORIAL.md** - Step-by-step tutorial
- **quick_pentest.sh** - Automated scanning script

---

**🎯 Ready for Penetration Testing!**

Start with OWASP ZAP or Burp Suite, and test the authentication endpoints first.
