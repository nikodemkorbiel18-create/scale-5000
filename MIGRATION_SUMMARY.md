# 🚀 PostgreSQL Migration - Quick Start

## ✅ What Was Done

**Problem:** Sign-in didn't work on Vercel because SQLite database resets on every deployment (ephemeral filesystem).

**Solution:** Migrated to Vercel Postgres for persistent data storage.

### Files Created

1. **server-postgres.js** - New server using PostgreSQL instead of SQLite
2. **db-init.sql** - Database schema initialization
3. **POSTGRES_MIGRATION_GUIDE.md** - Comprehensive migration guide
4. **package.json** - Updated with `@vercel/postgres` dependency
5. **vercel.json** - Already created (configures serverless deployment)

### Files to Review

- **IMPLEMENTATION_GUIDE.md** - Complete product roadmap
- **api/audit-enhanced.js** - Enhanced AI audit system
- **about.html**, **contact.html**, **privacy.html**, **terms.html** - Trust pages

---

## 🎯 Quick Deployment (3 Steps)

### 1. Install New Dependency

```bash
npm install
```

This installs `@vercel/postgres` added to package.json.

### 2. Replace Server File

```bash
# Backup old server (optional)
mv server.js server-sqlite-backup.js

# Use new Postgres server
mv server-postgres.js server.js
```

### 3. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Migrate to PostgreSQL for persistent database"
git push origin main
```

**Before first deploy:** Set up Vercel Postgres database (see below).

---

## 💾 Set Up Vercel Postgres (One-Time)

### Via Vercel Dashboard (Easiest)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **ScaleAI** project
3. Click **Storage** tab
4. Click **Create Database**
5. Choose **Postgres**
6. Select **Free Hobby Plan** (256 MB)
7. Name: `scaleai-db`
8. Click **Create**

✅ **Done!** Environment variables auto-configured.

### Set Additional Environment Variables

In Vercel Dashboard → Settings → Environment Variables, verify these exist:

- ✅ `POSTGRES_URL` (auto-added by Vercel)
- ✅ `OPENAI_API_KEY` (should already exist)
- ✅ `SESSION_SECRET` (should already exist)
- ✅ `NODE_ENV=production` (add if missing)

---

## 🧪 Test After Deployment

1. Visit your site: `https://your-project.vercel.app`
2. Click **Sign Up**
3. Create account with email + password
4. Generate an AI audit
5. **Log out**
6. **Log back in**
7. ✅ Verify audit history still shows (data persisted!)

**If this works, migration is successful!**

---

## 🔄 Local Development

### Option 1: Use Vercel Postgres Locally (Recommended)

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Start server
npm run dev
```

Uses same database as production. Requires internet.

### Option 2: Keep SQLite for Local Dev

```bash
# Keep both server files
# server.js → Postgres (for Vercel)
# server-sqlite-backup.js → SQLite (for local dev)

# Run SQLite version locally
node server-sqlite-backup.js
```

**Recommended:** Option 1 (less complexity, same environment)

---

## 📋 Complete Guide

For detailed instructions, troubleshooting, and rollback procedures:

👉 **Read POSTGRES_MIGRATION_GUIDE.md**

---

## 🐛 Quick Troubleshooting

### "Cannot connect to database"
```bash
# Pull latest environment variables
vercel env pull .env.local

# Verify POSTGRES_URL exists
cat .env.local | grep POSTGRES
```

### "Table does not exist"
The `initDatabase()` function creates tables automatically on first run. If tables don't exist:
1. Go to Vercel Dashboard → Storage → Your DB → **Query**
2. Paste contents of `db-init.sql`
3. Click **Run Query**

### "Sign up still doesn't work"
1. Check Vercel deployment logs: `vercel logs`
2. Verify database was created in Vercel dashboard
3. Check environment variables are set
4. Try redeploying: `vercel --prod --force`

---

## 📊 What Changed (Technical)

### Before (SQLite)
```javascript
const Database = require('better-sqlite3');
const db = new Database('scaleai.db');

const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email);
```

### After (PostgreSQL)
```javascript
const { sql } = require('@vercel/postgres');

const result = await sql`SELECT * FROM users WHERE email = ${email}`;
const user = result.rows[0];
```

**Key differences:**
- All database operations now use `async/await`
- Template literals instead of prepared statements
- `result.rows[0]` instead of `stmt.get()`
- `RETURNING id` instead of `lastInsertRowid`

---

## 🎯 Next Steps After Migration

Once migration is working:

### Immediate
1. ✅ Migration complete
2. **Add demo banner** to dashboard pages
3. **Update landing page** positioning (honest portfolio)
4. **Link trust pages** in footer

### This Week
5. Integrate **enhanced AI audit** (api/audit-enhanced.js)
6. Expand audit input form (7 fields)
7. Add rate limiting
8. Update landing page copy

### Next 2 Weeks
9. Build dashboard navigation
10. Create dashboard sections (Automations, Integrations, Profile)
11. Add demo data with clear labels
12. Polish mobile responsiveness

See **IMPLEMENTATION_GUIDE.md** for full roadmap.

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `server-postgres.js` → `server.js` | Main server (use this) |
| `db-init.sql` | Database schema |
| `vercel.json` | Deployment config |
| `package.json` | Dependencies (updated) |
| `POSTGRES_MIGRATION_GUIDE.md` | Detailed migration guide |
| `IMPLEMENTATION_GUIDE.md` | Product roadmap |

---

## ✅ Migration Checklist

- [ ] Install dependencies: `npm install`
- [ ] Create Vercel Postgres database (via dashboard)
- [ ] Replace server.js with server-postgres.js
- [ ] Commit and push to GitHub
- [ ] Verify deployment succeeds
- [ ] Test sign up
- [ ] Test login
- [ ] Test audit generation
- [ ] Verify data persists after logout/login
- [ ] Check no errors in Vercel logs

**When all checked:** Migration complete! 🎉

---

## 💡 Why This Matters

**Before migration:**
- Users lost on refresh
- Data deleted on redeploy
- Sign-in didn't work

**After migration:**
- ✅ Real user accounts persist
- ✅ Audit history saved permanently
- ✅ Professional, production-ready database
- ✅ Demonstrates real full-stack skills

This transforms your project from a local demo to a **deployable portfolio piece**.

---

**Need help?** Read POSTGRES_MIGRATION_GUIDE.md for detailed troubleshooting.
