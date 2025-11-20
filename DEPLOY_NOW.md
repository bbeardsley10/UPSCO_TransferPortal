# Quick Deployment Guide - Railway (Recommended)

This guide will get you deployed to Railway in about 15 minutes with a permanent URL.

## Why Railway?
- ✅ **Free tier**: $5/month credit (usually enough for small apps)
- ✅ **Automatic HTTPS**: Secure connection out of the box
- ✅ **PostgreSQL included**: Database managed for you
- ✅ **Auto-deployments**: Push to GitHub = auto-deploy
- ✅ **Permanent URL**: `your-app.railway.app` (or custom domain)
- ✅ **No credit card required** for free tier

---

## Step 1: Prepare Your Code (5 minutes)

### 1.1 Update Prisma Schema for Production

We'll make it work with both SQLite (local) and PostgreSQL (production):

The schema is already set up! We just need to make it environment-aware.

### 1.2 Create Environment Variables Template

Create `.env.example` (already done - see below)

### 1.3 Generate Session Secret

Run this command to generate a secure session secret:
```bash
openssl rand -base64 32
```

**Save this value** - you'll need it in Step 4.

---

## Step 2: Push to GitHub (2 minutes)

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Railway (5 minutes)

### 3.1 Sign Up
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub

### 3.2 Create Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `StreamlinedTransfers` repository
4. Railway will auto-detect Next.js and start building

### 3.3 Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway creates the database automatically
4. The `DATABASE_URL` will be automatically connected

---

## Step 4: Configure Environment Variables (2 minutes)

In your Railway project:

1. Click on your **web service** (not the database)
2. Go to "Variables" tab
3. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (Auto-filled) | Already set from PostgreSQL service |
| `SESSION_SECRET` | (Paste your generated secret) | From Step 1.3 |
| `NODE_ENV` | `production` | Tells Next.js it's production |

**How to add:**
- Click "+ New Variable"
- Enter variable name and value
- Click "Add"

---

## Step 5: Update Prisma Schema (1 minute)

We need to make the schema work with PostgreSQL in production.

**Option A: Environment-based (Recommended)**

Update `prisma/schema.prisma` to use environment variable:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**For local development**, create a `.env.local` file:
```env
DATABASE_URL="file:./prisma/dev.db"
```

Then update your local schema temporarily, or use a script to switch.

**Option B: Separate schemas** (More complex but cleaner)

We can create a production schema file. Let me know if you prefer this.

---

## Step 6: Run Database Migrations (1 minute)

In Railway:

1. Go to your **web service**
2. Click "Deployments" tab
3. Click on the latest deployment
4. Click "View Logs"
5. Or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma migrate deploy

# Seed database (optional)
railway run npm run seed
```

---

## Step 7: Handle File Uploads

**Current Issue**: Railway's filesystem is ephemeral (files disappear on redeploy).

**Quick Solution** (for now):
- Files will work, but be lost on redeploy
- This is fine for testing

**Permanent Solution** (later):
- Migrate to cloud storage (AWS S3, Railway Volume, etc.)
- We can set this up after initial deployment

---

## Step 8: Deploy! (Automatic)

Railway automatically:
- ✅ Builds your app
- ✅ Deploys it
- ✅ Provides URL: `https://your-app.railway.app`
- ✅ Sets up HTTPS

**Your app is now live!** 🎉

---

## Step 9: Test Your Deployment

1. Visit your Railway URL
2. Test login
3. Test file upload
4. Test transfer creation

---

## Step 10: Custom Domain (Optional)

1. In Railway project → Settings → Domains
2. Click "Custom Domain"
3. Enter your domain
4. Follow DNS instructions

---

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway uses latest LTS)

### Database Connection Error
- Verify `DATABASE_URL` is set in Variables
- Check that PostgreSQL service is running
- Ensure migrations have run

### File Uploads Not Working
- This is expected - files are ephemeral on Railway
- We'll migrate to persistent storage next

---

## Next Steps

1. ✅ **Test everything works**
2. ⏭️ **Set up cloud storage** for file uploads (AWS S3 or Railway Volume)
3. ⏭️ **Set up monitoring** (Railway has built-in monitoring)
4. ⏭️ **Configure backups** (Railway backs up PostgreSQL automatically)

---

## Cost

**Railway Free Tier:**
- $5/month credit
- Usually enough for small-medium apps
- Pay-as-you-go after credit

**Estimated Monthly Cost:**
- Web service: ~$2-5/month
- PostgreSQL: ~$2-3/month
- **Total: ~$4-8/month** (often covered by free credit)

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check deployment logs in Railway dashboard

