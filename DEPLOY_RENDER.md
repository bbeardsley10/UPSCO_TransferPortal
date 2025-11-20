# Deploy to Render.com - Step by Step Guide

This guide will get you deployed to Render.com with a permanent URL. Render offers a **free tier** that's perfect for your use case!

## Why Render.com?
- ✅ **Free tier**: Web service free (with cold starts), database free for 90 days
- ✅ **$7/month after 90 days** (just for PostgreSQL - very reasonable)
- ✅ **Automatic HTTPS**: Secure connection out of the box
- ✅ **PostgreSQL included**: Database managed for you
- ✅ **Auto-deployments**: Push to GitHub = auto-deploy
- ✅ **Permanent URL**: `your-app.onrender.com` (or custom domain)

---

## Prerequisites

1. GitHub account (free)
2. Render.com account (free signup)
3. Your code pushed to GitHub

---

## Step 1: Prepare Your Code (Already Done!)

✅ Your code is ready! We've already set up:
- Production schema for PostgreSQL
- Build scripts
- Environment variable templates

---

## Step 2: Push to GitHub (If Not Already Done)

```bash
# If you haven't already
git add .
git commit -m "Prepare for Render deployment"
git push
```

---

## Step 3: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with your GitHub account (easiest option)
4. Authorize Render to access your repositories

---

## Step 4: Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `streamlined-transfers-db` (or any name)
   - **Database**: `streamlined_transfers` (or leave default)
   - **User**: (auto-generated)
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: Latest (14 or 15)
   - **Plan**: **Free** (for 90 days, then $7/month)
3. Click **"Create Database"**
4. **Wait for it to be created** (takes 1-2 minutes)
5. **Copy the "Internal Database URL"** - you'll need this!

---

## Step 5: Create Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if not already connected
   - Select your `StreamlinedTransfers` repository
3. Configure the service:

### Basic Settings:
- **Name**: `streamlined-transfers` (or any name)
- **Region**: Same as your database
- **Branch**: `main` (or your default branch)
- **Root Directory**: `/` (leave empty)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: **Free** (spins down after 15 min inactivity)

### Environment Variables:
Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Paste the **Internal Database URL** from Step 4 |
| `SESSION_SECRET` | `VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=` |
| `NODE_ENV` | `production` |

**Important**: Use the **Internal Database URL** (not external) - it's faster and free!

4. Click **"Create Web Service"**

---

## Step 6: Wait for First Deployment

Render will:
1. Clone your repository
2. Install dependencies
3. Build your Next.js app
4. Deploy it

**This takes 5-10 minutes** on first deploy.

You can watch the build logs in real-time!

---

## Step 7: Run Database Migrations

After the first deployment completes:

1. In your **Web Service** dashboard, click **"Shell"** tab
2. Or use Render CLI:

```bash
# Install Render CLI (optional)
npm install -g render-cli

# Login
render login

# Run migrations
render run --service your-service-name -- npx prisma migrate deploy

# Seed database (optional)
render run --service your-service-name -- npm run seed
```

**Or use the Shell in Render dashboard:**
1. Go to your Web Service
2. Click **"Shell"** tab
3. Run:
```bash
npx prisma migrate deploy
npm run seed
```

---

## Step 8: Your App is Live! 🎉

Visit: `https://your-app-name.onrender.com`

**Note**: On the free tier, the first request after inactivity may take 30-60 seconds (cold start). Subsequent requests are fast!

---

## Step 9: Test Everything

1. ✅ Visit your Render URL
2. ✅ Test login
3. ✅ Test file upload
4. ✅ Test transfer creation
5. ✅ Test from different devices

---

## Step 10: Custom Domain (Optional)

1. In your Web Service → **"Settings"** → **"Custom Domains"**
2. Click **"Add Custom Domain"**
3. Enter your domain
4. Follow DNS instructions (add CNAME record)
5. Render will automatically set up HTTPS!

---

## Important Notes

### File Uploads
- Files are stored in the filesystem
- On free tier, files persist but may be lost on redeploy
- For production, we'll migrate to cloud storage later

### Cold Starts (Free Tier)
- Web service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Perfect for internal business tools (not high-traffic sites)

### Database
- Free for 90 days
- Then $7/month (very reasonable)
- Automatically backed up by Render

### Upgrading (Optional)
- **Starter Plan ($7/month)**: No cold starts, always on
- **Standard Plan ($25/month)**: More resources, better performance

---

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Render uses Node 18+)

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Use **Internal Database URL** (not external)
- Check that database is running
- Ensure migrations have run

### App Shows "Application Error"
- Check logs in Render dashboard
- Verify environment variables are set
- Ensure migrations have run
- Check that build completed successfully

### Cold Start Too Slow
- This is normal on free tier
- Upgrade to Starter plan ($7/month) for always-on
- Or keep using free tier (first request is slow, then fast)

---

## Cost Summary

### Free Tier (First 90 Days):
- Web Service: **FREE**
- PostgreSQL: **FREE**
- **Total: $0/month** 🎉

### After 90 Days:
- Web Service: **FREE** (with cold starts)
- PostgreSQL: **$7/month**
- **Total: $7/month**

### Optional Upgrade:
- Starter Plan: **$7/month** (no cold starts)
- **Total: $14/month** (web service + database)

---

## Next Steps

1. ✅ **Test everything works**
2. ⏭️ **Set up cloud storage** for file uploads (we can do this next)
3. ⏭️ **Configure monitoring** (Render has built-in monitoring)
4. ⏭️ **Set up custom domain** (if desired)

---

## Need Help?

- Render Docs: https://render.com/docs
- Render Support: support@render.com
- Check deployment logs in Render dashboard

---

## Quick Reference

**Your Session Secret:**
```
VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Environment Variables:**
- `DATABASE_URL` - From PostgreSQL service (Internal URL)
- `SESSION_SECRET` - See above
- `NODE_ENV` - `production`

