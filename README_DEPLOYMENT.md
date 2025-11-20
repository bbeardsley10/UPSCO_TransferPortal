# 🚀 Quick Start: Deploy to Railway

## Your Session Secret (Save This!)
```
VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=
```

## Step-by-Step Deployment

### 1. Push to GitHub (if not already done)
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 2. Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `StreamlinedTransfers` repository
4. Railway will start building automatically

### 3. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Wait for it to be created

### 4. Set Environment Variables
In your Railway **web service** (not database), go to Variables tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (Auto-filled from PostgreSQL - don't set manually) |
| `SESSION_SECRET` | `VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=` |
| `NODE_ENV` | `production` |

### 5. Update Schema for PostgreSQL
The build script will automatically use the production schema when it detects PostgreSQL.

### 6. Run Migrations
After first deployment, in Railway:
1. Go to your web service
2. Click "Deployments" → Latest deployment → "View Logs"
3. Or use Railway CLI:
```bash
railway run npx prisma migrate deploy
railway run npm run seed
```

### 7. Your App is Live! 🎉
Visit: `https://your-app-name.railway.app`

---

## Important Notes

### File Uploads
- Files will work but are **temporary** (lost on redeploy)
- For permanent storage, we'll set up cloud storage next

### Database
- PostgreSQL is automatically backed up by Railway
- Migrations run automatically on deploy

### Custom Domain
- Go to Settings → Domains in Railway
- Add your custom domain
- Follow DNS instructions

---

## Need Help?
See `DEPLOY_NOW.md` for detailed instructions.

