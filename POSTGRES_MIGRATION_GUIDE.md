# PostgreSQL Migration Guide

## 🎯 Overview

This guide walks you through migrating ScaleAI Systems from SQLite to Vercel Postgres, which **fixes the sign-in persistence issue** on Vercel deployments.

**Why migrate?**
- ✅ Persistent database (survives deployments)
- ✅ Production-ready for serverless
- ✅ Better performance and scalability
- ✅ Free tier available (256 MB)

---

## 📋 Prerequisites

- Vercel account
- Project already deployed to Vercel (or ready to deploy)
- Node.js installed locally
- Git installed

---

## 🚀 Migration Steps

### Step 1: Install Dependencies

```bash
# Install Vercel Postgres package
npm install @vercel/postgres

# This updates package.json automatically
```

**What changed:**
- Added `@vercel/postgres` dependency
- Removed `better-sqlite3` from active use (kept for local development if needed)

### Step 2: Set Up Vercel Postgres Database

#### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your ScaleAI project
3. Go to **Storage** tab
4. Click **Create Database**
5. Choose **Postgres**
6. Select **Free Hobby Plan** (256 MB, perfect for portfolio)
7. Name it: `scaleai-db`
8. Click **Create**

Vercel will automatically set these environment variables:
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login
vercel login

# Create database
vercel postgres create scaleai-db

# Link to your project
vercel link
```

### Step 3: Initialize Database Schema

The tables will be created automatically on first server startup by `initDatabase()` function in `server-postgres.js`.

**Alternatively, run manually:**

1. Go to Vercel Dashboard → Storage → Your Postgres DB → **Query**
2. Paste contents of `db-init.sql`
3. Click **Run Query**

Or using CLI:
```bash
# Get database connection string from Vercel dashboard
psql "your-connection-string-here" < db-init.sql
```

### Step 4: Switch to New Server File

**Option A: Replace server.js (Recommended)**

```bash
# Backup old server
mv server.js server-sqlite.js

# Use new Postgres server
mv server-postgres.js server.js

# Commit changes
git add .
git commit -m "Migrate to PostgreSQL for production persistence"
git push origin main
```

**Option B: Update vercel.json to use server-postgres.js**

Edit `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-postgres.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server-postgres.js"
    },
    // ... rest of routes
  ]
}
```

### Step 5: Update Environment Variables

Make sure these are set in Vercel:

1. Go to Project Settings → Environment Variables
2. Verify these exist (auto-added by Vercel Postgres):
   - `POSTGRES_URL` ✅
   - Plus other POSTGRES_* variables

3. Add your existing variables if not already set:
   - `OPENAI_API_KEY` (your OpenAI API key)
   - `SESSION_SECRET` (random secure string)
   - `NODE_ENV=production`

```bash
# Or via CLI
vercel env add OPENAI_API_KEY production
vercel env add SESSION_SECRET production
```

### Step 6: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or just push to main if you have auto-deploy enabled
git push origin main
```

### Step 7: Verify Migration

1. Visit your deployed site
2. Try **Sign Up** with a new account
3. Generate an AI audit
4. **Log out** and **log back in**
5. Verify your audit history is still there

**Test checklist:**
- [ ] Sign up works
- [ ] Login works
- [ ] Session persists across page refreshes
- [ ] AI audit generates successfully
- [ ] Audit history loads
- [ ] Data persists after redeployment

---

## 🔄 Migrating Existing Data (Optional)

If you have existing users in your local SQLite database that you want to migrate:

### Export from SQLite

```bash
# Install sqlite3 CLI if not already installed
npm install -g sqlite3

# Export users
sqlite3 scaleai.db "SELECT * FROM users;" > users.csv

# Export audits
sqlite3 scaleai.db "SELECT * FROM ai_audits;" > audits.csv
```

### Import to Postgres

```sql
-- In Vercel Postgres Query editor or psql

-- Import users (adjust values as needed)
COPY users(id, email, password_hash, created_at)
FROM '/path/to/users.csv'
DELIMITER ','
CSV HEADER;

-- Import audits
COPY ai_audits(id, user_id, business_description, current_revenue, ai_response, created_at)
FROM '/path/to/audits.csv'
DELIMITER ','
CSV HEADER;

-- Reset sequences to avoid ID conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('ai_audits_id_seq', (SELECT MAX(id) FROM ai_audits));
```

**For portfolio demo:** Not necessary to migrate test data. Fresh start is fine.

---

## 🧪 Local Development

### Option 1: Use Vercel Postgres Locally

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Start server (will connect to Vercel Postgres)
npm run dev
```

**Pros:** Same database as production
**Cons:** Requires internet connection

### Option 2: Keep SQLite for Local Dev

```bash
# Use old server for local development
node server-sqlite.js

# Use Postgres server for production (Vercel)
# (handled by vercel.json)
```

**Pros:** Fast local development, no internet needed
**Cons:** Different database engines dev vs prod

**Recommended:** Option 1 (use Vercel Postgres locally)

---

## 🔍 Key Differences: SQLite vs PostgreSQL

### Database Queries

**SQLite (old):**
```javascript
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email);
```

**PostgreSQL (new):**
```javascript
const result = await sql`SELECT * FROM users WHERE email = ${email}`;
const user = result.rows[0];
```

### Inserting Data

**SQLite (old):**
```javascript
const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
const result = stmt.run(email, passwordHash);
const userId = result.lastInsertRowid;
```

**PostgreSQL (new):**
```javascript
const result = await sql`
  INSERT INTO users (email, password_hash)
  VALUES (${email}, ${passwordHash})
  RETURNING id
`;
const userId = result.rows[0].id;
```

### Data Types

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `TEXT` | `TEXT` or `VARCHAR` |
| `DATETIME` | `TIMESTAMP` |
| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` |

### API Differences

| SQLite | PostgreSQL |
|--------|------------|
| Synchronous | Async/await required |
| `stmt.run()` | `sql\`...\`` (template literal) |
| `stmt.get()` | `result.rows[0]` |
| `stmt.all()` | `result.rows` |
| `lastInsertRowid` | `RETURNING id` |

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Cannot connect to database"

**Cause:** Environment variables not set correctly

**Solution:**
```bash
# Verify environment variables
vercel env ls

# Pull latest environment variables
vercel env pull .env.local

# Check .env.local has POSTGRES_URL
cat .env.local | grep POSTGRES
```

### Issue 2: "Table does not exist"

**Cause:** Database schema not initialized

**Solution:**
Run the initialization script manually in Vercel Postgres Query editor, or wait for `initDatabase()` to run on next deployment.

### Issue 3: "Duplicate key error"

**Cause:** Trying to insert email that already exists

**Solution:** This is expected behavior. Error handling is already implemented:
```javascript
if (error.message.includes('duplicate key')) {
  return res.status(400).json({ error: 'Email already exists' });
}
```

### Issue 4: "Session not persisting"

**Cause:** Cookie settings or session middleware misconfigured

**Solution:**
- Ensure `cookie.secure` is `true` in production
- Verify `NODE_ENV=production` is set
- Check that HTTPS is enabled on Vercel (it is by default)

### Issue 5: "Too many connections"

**Cause:** Connection pooling not configured

**Solution:** Vercel Postgres automatically pools connections. If you see this:
1. Check you're not creating multiple SQL clients
2. Use `POSTGRES_URL` (pooled) not `POSTGRES_URL_NON_POOLING`
3. Reduce number of concurrent requests in testing

---

## 📊 Vercel Postgres Free Tier Limits

| Resource | Free Tier Limit |
|----------|-----------------|
| Storage | 256 MB |
| Compute Time | 60 hours/month |
| Rows Written | 256 / hour |
| Data Transfer | 256 MB / month |

**Is this enough for a portfolio project?**

✅ **Yes, more than enough!**

Estimated usage:
- Average user: ~200 bytes (email + password hash)
- Average audit: ~1-2 KB
- 1000 users + 5000 audits = ~10-15 MB
- Well under 256 MB limit

**If you exceed limits:** Upgrade to Hobby plan ($5/month) or Pro plan ($20/month)

---

## 🔐 Security Best Practices

### 1. Environment Variables

**Never commit these to Git:**
- `POSTGRES_URL`
- `OPENAI_API_KEY`
- `SESSION_SECRET`

**Verify .gitignore includes:**
```
.env
.env.local
.env*.local
.vercel
```

### 2. SQL Injection Prevention

✅ **Good (Parameterized):**
```javascript
await sql`SELECT * FROM users WHERE email = ${email}`;
```

❌ **Bad (Vulnerable):**
```javascript
await sql`SELECT * FROM users WHERE email = '${email}'`; // DON'T DO THIS
```

The `@vercel/postgres` library automatically escapes parameters in template literals.

### 3. Session Security

Already configured in `server-postgres.js`:
```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000
}
```

### 4. Rate Limiting

Add to prevent abuse (recommended for future):
```javascript
npm install express-rate-limit
```

---

## 🎯 Testing Checklist

Before considering migration complete:

**Local Testing:**
- [ ] `npm install` succeeds
- [ ] Server starts without errors
- [ ] Can sign up new user
- [ ] Can log in
- [ ] Can generate audit
- [ ] Audit history loads

**Production Testing:**
- [ ] Deployment succeeds
- [ ] No environment variable errors in logs
- [ ] Sign up works
- [ ] Login works
- [ ] Sessions persist across page refreshes
- [ ] AI audit generates
- [ ] Audit history persists after re-deployment
- [ ] Logout works

**Database Testing:**
```bash
# Check tables exist
vercel postgres sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# Check user count
vercel postgres sql "SELECT COUNT(*) FROM users;"

# Check audit count
vercel postgres sql "SELECT COUNT(*) FROM ai_audits;"
```

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong, you can quickly rollback:

```bash
# Revert to SQLite version
git checkout HEAD~1 server.js

# Or if you kept backup
mv server.js server-postgres-backup.js
mv server-sqlite.js server.js

# Update package.json to remove @vercel/postgres (optional)
# Deploy
git commit -am "Rollback to SQLite temporarily"
git push origin main
```

**Note:** SQLite won't work on Vercel serverless, so you'd need to:
1. Deploy to Railway/Render instead, OR
2. Accept that database resets on each deployment

---

## 📚 Additional Resources

- **Vercel Postgres Docs:** https://vercel.com/docs/storage/vercel-postgres
- **@vercel/postgres NPM:** https://www.npmjs.com/package/@vercel/postgres
- **PostgreSQL Tutorial:** https://www.postgresql.org/docs/current/tutorial.html
- **SQL Syntax Differences:** https://www.sqlite.org/lang.html vs https://www.postgresql.org/docs/

---

## ✅ Success Criteria

Migration is complete when:

1. ✅ Server deploys successfully to Vercel
2. ✅ Users can sign up and log in
3. ✅ Sessions persist across page reloads
4. ✅ AI audits generate and save
5. ✅ Audit history loads correctly
6. ✅ Data persists after redeployment
7. ✅ No database connection errors in logs

---

## 🎉 Next Steps

After successful migration:

1. **Update landing page** with honest positioning (see IMPLEMENTATION_GUIDE.md)
2. **Add demo environment banner** to dashboard
3. **Implement enhanced AI audit** with structured output
4. **Expand dashboard** with new sections
5. **Add trust page links** to footer

See **IMPLEMENTATION_GUIDE.md** for complete roadmap.

---

## 💬 Troubleshooting Help

If you run into issues:

1. Check Vercel deployment logs:
   ```bash
   vercel logs
   ```

2. Check Vercel Postgres logs:
   Go to Dashboard → Storage → Your DB → Logs

3. Test database connection manually:
   ```bash
   vercel postgres sql "SELECT 1 as test;"
   ```

4. Verify environment variables:
   ```bash
   vercel env ls
   ```

---

**Migration Created:** December 19, 2025
**Last Updated:** December 19, 2025
**Status:** Ready for deployment ✅
