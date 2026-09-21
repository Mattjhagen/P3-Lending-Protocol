# Production Email Setup Guide

## Current Status: Development Mode (Mailhog)

Currently, all emails are captured by Mailhog and **DO NOT** reach real user inboxes.

## To Send Emails to Real Users

### Option 1: SendGrid (Recommended)

**Free tier:** 100 emails/day forever

1. **Sign up:** https://sendgrid.com/
2. **Create API key:** Settings → API Keys → Create API Key
3. **Update `.env`:**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=<your_sendgrid_api_key>
   SMTP_FROM=noreply@p3lending.space
   SMTP_SECURE=true
   ```

4. **Verify sender domain:** 
   - SendGrid → Settings → Sender Authentication
   - Verify p3lending.space domain
   - Add DNS records (SPF, DKIM, DMARC)

### Option 2: AWS SES

**Free tier:** 62,000 emails/month (when sending from EC2)

1. **AWS Console:** https://console.aws.amazon.com/ses/
2. **Verify email/domain:** SES → Verified identities
3. **Create SMTP credentials:** SES → SMTP Settings → Create SMTP Credentials
4. **Update `.env`:**
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=<your_smtp_username>
   SMTP_PASS=<your_smtp_password>
   SMTP_FROM=noreply@p3lending.space
   SMTP_SECURE=true
   ```

5. **Request production access:** 
   - Initially in "sandbox mode" (can only send to verified emails)
   - Request production access to send to any email

### Option 3: Postmark

**Free tier:** 100 emails/month, then $15/month for 10k emails

1. **Sign up:** https://postmarkapp.com/
2. **Add sender signature:** Servers → Sender Signatures
3. **Get SMTP credentials:** Servers → Credentials
4. **Update `.env`:**
   ```env
   SMTP_HOST=smtp.postmarkapp.com
   SMTP_PORT=587
   SMTP_USER=<your_server_token>
   SMTP_PASS=<your_server_token>
   SMTP_FROM=noreply@p3lending.space
   SMTP_SECURE=true
   ```

### Option 4: Mailgun

**Free tier:** 5,000 emails/month for 3 months

1. **Sign up:** https://mailgun.com/
2. **Add domain:** Sending → Domains → Add New Domain
3. **Get SMTP credentials:** Sending → Domain Settings → SMTP
4. **Update `.env`:**
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=<your_smtp_login>
   SMTP_PASS=<your_smtp_password>
   SMTP_FROM=noreply@p3lending.space
   SMTP_SECURE=true
   ```

## After Changing SMTP Settings

1. **Restart auth server:**
   ```bash
   pkill -f local-auth-server
   cd /home/matt/P3_Official/P3-Lending-Protocol
   nohup node local-auth-server.cjs > /tmp/auth-server.log 2>&1 &
   ```

2. **Test with a real email:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-real-email@gmail.com",
       "password": "TestPassword123!",
       "full_name": "Test User"
     }'
   ```

3. **Check your real inbox** - you should receive the confirmation email!

## Domain Authentication (Important!)

For best deliverability, set up these DNS records for `p3lending.space`:

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.sendgrid.net ~all
```
(Replace `_spf.sendgrid.net` with your provider's SPF record)

### DKIM Record
Your email provider will give you specific DKIM records to add.

### DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@p3lending.space
```

## Monitoring Email Delivery

Most providers offer dashboards to monitor:
- Delivery rates
- Bounce rates
- Spam complaints
- Opens/clicks (if enabled)

## Cost Comparison

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| SendGrid | 100/day forever | $15/mo for 40k |
| AWS SES | 62k/month (EC2) | $0.10/1000 emails |
| Postmark | 100/month | $15/mo for 10k |
| Mailgun | 5k/month (3 months) | $35/mo for 50k |

## Keeping Mailhog for Testing

You can keep Mailhog running alongside production email:

**Local development:** Use Mailhog (current .env)
**Production/Staging:** Use real SMTP (.env.production)

Or use environment detection in code:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const smtpConfig = isDevelopment ? {
  host: 'localhost',
  port: 1025,
  secure: false
} : {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};
```

## Testing Checklist

- [ ] SMTP credentials configured
- [ ] Sender domain verified with email provider
- [ ] DNS records (SPF, DKIM, DMARC) added
- [ ] Auth server restarted with new config
- [ ] Test registration with real email address
- [ ] Confirmation email received in real inbox
- [ ] Confirmation link works correctly
- [ ] Check spam folder if email doesn't arrive
- [ ] Monitor provider dashboard for delivery issues

## Troubleshooting

### Emails not arriving
1. Check spam/junk folder
2. Verify sender domain is authenticated
3. Check provider dashboard for bounces
4. Review auth server logs: `tail -f /tmp/auth-server.log`

### "Authentication failed" error
1. Verify SMTP_USER and SMTP_PASS are correct
2. Check if using API key instead of password (SendGrid uses "apikey" as username)
3. Ensure SMTP_SECURE matches port (587=true, 25=false)

### Emails marked as spam
1. Set up SPF, DKIM, DMARC records
2. Verify sender domain
3. Avoid spammy content (all caps, too many links, etc.)
4. Use consistent "From" address

---

**Remember:** Once you switch to production SMTP, Mailhog will no longer capture emails unless you change the config back!
