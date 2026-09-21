# P3 Lending Protocol - Deployment Guide

**Platform Status:** 🟢 LIVE  
**Version:** 2.4.0  
**Last Updated:** September 21, 2026

---

## 🌐 Live Deployment

| Service | URL | Status |
|---------|-----|--------|
| **Main Platform** | https://p3lending.space | ✅ Live |
| **Admin Portal** | https://admin.p3lending.space | ✅ Live |
| **API Server** | https://api.p3lending.space | ✅ Live |
| **Email Testing** | https://mail.p3lending.space | ✅ Live |

All services are accessible via Cloudflare Tunnel (no port forwarding required).

---

## 📦 What's Deployed

### ✅ Core Services

- **Frontend (Vite + React)** - Running on port 5173
- **Admin Portal** - Running on port 5174
- **Authentication API** - Running on port 5001
- **PostgreSQL Database** - Running on port 5432 (Docker)
- **Mailhog Email Server** - Running on ports 1025 (SMTP) & 8025 (Web UI)
- **Cloudflare Tunnel** - Routing all HTTPS traffic

### ✅ Features Enabled

- ✅ User registration with email confirmation
- ✅ Login/logout functionality
- ✅ Admin access for `@p3lending.space` emails
- ✅ Email delivery via Mailhog (development)
- ✅ PostgreSQL database with auth schema
- ✅ JWT token authentication
- ✅ HTTPS via Cloudflare tunnel
- ✅ Zero-configuration local development

---

## 🔑 Admin Access

**Default Admin Account:**
```
Email:    admin@p3lending.space
Password: AdminPass123!
```

**Admin Access Rule:**  
Any user with `@p3lending.space` email automatically receives admin role.

**Login:**
- Main App: https://p3lending.space
- Admin Portal: https://admin.p3lending.space

---

## 🏗️ Architecture

```
Internet (HTTPS)
    ↓
Cloudflare Tunnel (efb70a60-ec73-4c5d-833f-2729039d1a31)
    ↓
┌─────────────────────────────────────────────┐
│  Local Services (R510 Server)               │
├─────────────────────────────────────────────┤
│  • Frontend (Vite)        → :5173           │
│  • Admin Portal (Vite)    → :5174           │
│  • Auth API (Express)     → :5001           │
│  • Mailhog Web UI         → :8025           │
│  • Mailhog SMTP           → :1025           │
│  • PostgreSQL (Docker)    → :5432           │
└─────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites

```bash
# Check all services are running
docker ps | grep p3-postgres    # PostgreSQL
docker ps | grep p3-mailhog     # Mailhog
screen -r p3tunnel              # Cloudflare tunnel
ps aux | grep local-auth-server # Auth server
```

### 2. Start Development Servers

```bash
cd /home/matt/P3_Official/P3-Lending-Protocol

# Terminal 1: Frontend
npm run dev

# Terminal 2: Admin Portal  
cd admin && npm run dev

# Terminal 3: Auth Server (if not running)
node local-auth-server.cjs
```

### 3. Access the Platform

Open https://p3lending.space in your browser.

---

## 📧 Email System

### Current Setup: Mailhog (Development)

**Purpose:** Capture all outgoing emails for testing  
**Web UI:** https://mail.p3lending.space  
**SMTP:** localhost:1025

**Important:** Emails are NOT delivered to real inboxes. They're captured by Mailhog for testing.

### Switching to Production Email

See [EMAIL_PRODUCTION_SETUP.md](./EMAIL_PRODUCTION_SETUP.md) for:
- SendGrid setup (100 emails/day free)
- AWS SES setup (62k emails/month free)
- Postmark setup
- Mailgun setup

---

## 🗄️ Database

### PostgreSQL (Docker)

**Container:** `p3-postgres`  
**Database:** `p3lending`  
**User:** `p3user`  
**Password:** `p3password`  
**Port:** 5432

### Access Database

```bash
# Via Docker
docker exec -it p3-postgres psql -U p3user -d p3lending

# Via psql
psql postgresql://p3user:p3password@localhost:5432/p3lending
```

### Schema

```sql
-- Auth schema
auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMP,
  confirmation_token TEXT,
  raw_user_meta_data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 🔧 Configuration Files

### Environment Variables

**Location:** `/home/matt/P3_Official/P3-Lending-Protocol/.env`

```env
# Frontend
VITE_SUPABASE_URL=http://localhost:5001
VITE_BACKEND_URL=http://localhost:5001

# Database
DATABASE_URL=postgresql://p3user:p3password@localhost:5432/p3lending
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=p3lending
POSTGRES_USER=p3user
POSTGRES_PASSWORD=p3password

# Auth Server
PORT=5001
FRONTEND_URL=https://p3lending.space
JWT_SECRET=local-dev-secret-change-in-production

# Email (Mailhog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@p3lending.local
SMTP_SECURE=false
```

### Cloudflare Tunnel

**Config:** `~/.cloudflared/config.yml`  
**Tunnel ID:** `efb70a60-ec73-4c5d-833f-2729039d1a31`

```yaml
ingress:
  - hostname: p3lending.space
    service: http://localhost:5173
  - hostname: admin.p3lending.space
    service: http://localhost:5174
  - hostname: api.p3lending.space
    service: http://localhost:5001
  - hostname: mail.p3lending.space
    service: http://localhost:8025
  - service: http_status:404
```

---

## 🧪 Testing

### Register a User

```bash
curl -X POST https://api.p3lending.space/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User"
  }'
```

### Check Email in Mailhog

Open: https://mail.p3lending.space

### Login

```bash
curl -X POST https://api.p3lending.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

---

## 🔍 Monitoring

### Service Status

```bash
# Auth server status
curl https://api.p3lending.space/health

# Database status
curl https://api.p3lending.space/api/db-status

# Check all Docker containers
docker ps

# Check Cloudflare tunnel
screen -r p3tunnel
```

### Logs

```bash
# Auth server logs
tail -f /tmp/auth-server.log

# PostgreSQL logs
docker logs p3-postgres

# Mailhog logs
docker logs p3-mailhog
```

---

## 🛠️ Maintenance

### Restart Services

```bash
# Restart auth server
pkill -f local-auth-server
cd /home/matt/P3_Official/P3-Lending-Protocol
nohup node local-auth-server.cjs > /tmp/auth-server.log 2>&1 &

# Restart database
docker restart p3-postgres

# Restart Mailhog
docker restart p3-mailhog

# Restart Cloudflare tunnel
screen -r p3tunnel
# Ctrl+C to stop, then restart:
cloudflared tunnel run
```

### Database Backup

```bash
# Backup database
docker exec p3-postgres pg_dump -U p3user p3lending > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i p3-postgres psql -U p3user p3lending < backup_20260921.sql
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [MAILHOG_SETUP_COMPLETE.md](./MAILHOG_SETUP_COMPLETE.md) | Mailhog email server setup |
| [EMAIL_PRODUCTION_SETUP.md](./EMAIL_PRODUCTION_SETUP.md) | Production email configuration |
| [ADMIN_ACCESS_SETUP.md](./ADMIN_ACCESS_SETUP.md) | Admin role configuration |
| [CLAUDE.md](./CLAUDE.md) | Project overview for Claude |

---

## 🔐 Security Notes

### Development vs Production

**Current Setup (Development):**
- Using localhost SMTP (Mailhog)
- Default JWT secret (change in production)
- No SSL on local services (Cloudflare provides HTTPS)

**For Production:**
- [ ] Use real SMTP service (SendGrid/SES)
- [ ] Generate strong JWT secret
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts
- [ ] Configure CORS properly
- [ ] Enable database backups
- [ ] Set up error tracking (Sentry)

---

## 🐛 Troubleshooting

### Can't Access Website

1. Check Cloudflare tunnel: `screen -r p3tunnel`
2. Check if services are running: `ps aux | grep -E "vite|local-auth-server"`
3. Check logs: `tail -f /tmp/auth-server.log`

### Emails Not Showing in Mailhog

1. Check Mailhog is running: `docker ps | grep mailhog`
2. Check SMTP config in `.env`
3. Restart auth server
4. Check auth server logs: `tail -f /tmp/auth-server.log`

### Database Connection Failed

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Test connection: `psql postgresql://p3user:p3password@localhost:5432/p3lending`
3. Check Docker logs: `docker logs p3-postgres`
4. Restart container: `docker restart p3-postgres`

### Login Not Working

1. Check user exists: `curl https://api.p3lending.space/api/debug/users`
2. Confirm email first (check Mailhog)
3. Check password is correct
4. Check auth server logs

---

## 📞 Support

**Repository:** https://github.com/Mattjhagen/P3_Official  
**Documentation:** /P3-Lending-Protocol/DEPLOYMENT_README.md  
**Server:** R510 (100.103.3.35 via Tailscale)

---

## ✅ Deployment Checklist

- [x] PostgreSQL database running
- [x] Mailhog email server running
- [x] Auth server running (port 5001)
- [x] Frontend dev server (port 5173)
- [x] Admin portal dev server (port 5174)
- [x] Cloudflare tunnel configured
- [x] DNS records configured
- [x] Admin access configured
- [x] Email confirmation flow working
- [x] Documentation complete

---

**Deployed by:** Claude Sonnet 4.5  
**Deployment Date:** September 21, 2026  
**Server:** Dell R510 (Shaggoth Box)
