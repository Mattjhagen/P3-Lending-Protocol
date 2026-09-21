# Admin Access Configuration ✅

**Status:** OPERATIONAL  
**Last Updated:** September 21, 2026

---

## 🎯 Overview

The P3 Lending platform now automatically grants **admin access** to users with `@p3lending.space` email addresses.

---

## 📧 Email Domain Rules

| Email Domain | Role | Access Level |
|--------------|------|--------------|
| `@p3lending.space` | **admin** | Full admin access to all features |
| Other domains | **authenticated** | Regular user access |

---

## 🔑 Default Admin Account

A default admin account has been created for testing:

```
Email:    admin@p3lending.space
Password: AdminPass123!
Role:     admin
```

**Status:** Email confirmed ✅  
**Ready to use:** Yes

---

## 🌐 Login Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| Main App | https://p3lending.space | User dashboard |
| Admin Portal | https://admin.p3lending.space | Admin dashboard |
| API | https://api.p3lending.space | Backend API |
| Mailhog | https://mail.p3lending.space | Email testing |

---

## 🧪 How It Works

### Registration Flow

1. **User registers** with email address
2. **System checks** email domain:
   - If `@p3lending.space` → assigns `role: "admin"`
   - If other domain → assigns `role: "authenticated"`
3. **JWT token** includes the role claim
4. **Frontend/API** can check `user.role` to grant/restrict access

### Login Flow

1. **User logs in** with email/password
2. **System checks** email domain again
3. **JWT token** generated with appropriate role
4. **Role included** in response for frontend routing

---

## 🔐 JWT Token Structure

Admin users receive tokens with the `admin` role:

```json
{
  "sub": "user-id-uuid",
  "email": "admin@p3lending.space",
  "role": "admin",
  "user_metadata": {
    "full_name": "Admin User",
    "role": "admin"
  },
  "iat": 1790025932,
  "exp": 1790112332
}
```

Regular users receive `role: "authenticated"` instead.

---

## 🧩 Implementation Details

### Auth Server Code

The auth server (`local-auth-server.cjs`) includes this logic:

```javascript
// Check if user is admin (p3lending.space domain)
const isAdmin = email.toLowerCase().endsWith('@p3lending.space');
const userRole = isAdmin ? 'admin' : 'authenticated';
```

This is applied in:
- ✅ **Registration endpoint** (`/api/auth/register`)
- ✅ **Login endpoint** (`/api/auth/login`)

### Database Storage

User roles are stored in `auth.users.raw_user_meta_data`:

```json
{
  "full_name": "Admin User",
  "role": "admin"
}
```

---

## 🎨 Frontend Integration

### Checking User Role

```javascript
// After login/registration
const { user, token } = response.data;

if (user.role === 'admin') {
  // Redirect to admin portal
  window.location.href = 'https://admin.p3lending.space';
} else {
  // Redirect to main app
  window.location.href = 'https://p3lending.space';
}
```

### Protected Routes

```javascript
// In your router/auth guard
const userRole = getUserRoleFromToken(); // Decode JWT

if (requiresAdmin && userRole !== 'admin') {
  // Redirect to unauthorized page
  return <Redirect to="/unauthorized" />;
}
```

### Decode JWT to Check Role

```javascript
import jwt_decode from 'jwt-decode';

const token = localStorage.getItem('authToken');
const decoded = jwt_decode(token);

console.log(decoded.role); // 'admin' or 'authenticated'
```

---

## 🧪 Testing Admin Access

### 1. Create Admin User

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@p3lending.space",
    "password": "YourSecurePassword123!",
    "full_name": "Your Name"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "email": "yourname@p3lending.space",
    "role": "admin"  // ← Should be 'admin'
  },
  "token": "...",
  "message": "Registration successful..."
}
```

### 2. Confirm Email

1. Open Mailhog: https://mail.p3lending.space
2. Find confirmation email
3. Copy the token from the email
4. Confirm:

```bash
curl -X POST http://localhost:5001/api/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN_HERE"}'
```

### 3. Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@p3lending.space",
    "password": "YourSecurePassword123!"
  }'
```

Expected response should include `"role": "admin"`.

### 4. Test Regular User (Non-Admin)

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "UserPass123!",
    "full_name": "Regular User"
  }'
```

Expected response should include `"role": "authenticated"`.

---

## 🔧 Modifying Admin Domain

To add additional admin domains, edit `local-auth-server.cjs`:

```javascript
// Current code:
const isAdmin = email.toLowerCase().endsWith('@p3lending.space');

// To support multiple domains:
const adminDomains = ['@p3lending.space', '@p3admin.com'];
const isAdmin = adminDomains.some(domain => 
  email.toLowerCase().endsWith(domain)
);
```

Then restart the auth server:
```bash
pkill -f local-auth-server
cd /home/matt/P3_Official/P3-Lending-Protocol
nohup node local-auth-server.cjs > /tmp/auth-server.log 2>&1 &
```

---

## 🛡️ Security Considerations

### ✅ Secure Practices

- Email domain check happens server-side (not client-side)
- Role stored in JWT and signed with secret key
- Role verified on every API request
- Email confirmation required before full access

### ⚠️ Important Notes

1. **Domain Ownership:** Ensure you control `p3lending.space` email domain
2. **JWT Secret:** Use a strong secret in production (`JWT_SECRET` env var)
3. **HTTPS Only:** Always use HTTPS in production for token transmission
4. **Token Expiration:** Tokens expire after 24 hours (configurable)

---

## 📊 Admin Features (To Be Implemented)

Once admin role is integrated into the frontend, admins can:

- [ ] View all users
- [ ] Manage loan requests
- [ ] Access analytics dashboard
- [ ] Configure platform settings
- [ ] Moderate content
- [ ] Manage support tickets
- [ ] View system logs

---

## 🔗 Related Documentation

- [MAILHOG_SETUP_COMPLETE.md](./MAILHOG_SETUP_COMPLETE.md) - Email server setup
- [EMAIL_PRODUCTION_SETUP.md](./EMAIL_PRODUCTION_SETUP.md) - Production email configuration
- [local-auth-server.cjs](./local-auth-server.cjs) - Auth server implementation

---

## 🎉 Quick Start

**To login as admin right now:**

1. Open: https://p3lending.space
2. Click "Login"
3. Enter:
   - Email: `admin@p3lending.space`
   - Password: `AdminPass123!`
4. You should be logged in with admin privileges!

---

**Setup completed by:** Claude Sonnet 4.5  
**Documentation:** P3_Official/P3-Lending-Protocol/ADMIN_ACCESS_SETUP.md
