# Deployment Guide

## Quick Deploy to Railway (Easiest Option)

### Prerequisites
1. GitHub account
2. Railway account (sign up at railway.app)

### Step 1: Prepare Your Code

1. **Create a `.env.example` file** (for reference):
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
SESSION_SECRET="your-random-secret-key-here"
NODE_ENV="production"
```

2. **Update Prisma schema for PostgreSQL** (if not already done):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Commit and push to GitHub**:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Next.js and start building

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New" → "Database" → "Add PostgreSQL"
2. Railway will create a PostgreSQL database
3. Copy the `DATABASE_URL` from the database service

### Step 4: Configure Environment Variables

In your Railway project settings, add these environment variables:

- `DATABASE_URL` - (Auto-filled from PostgreSQL service)
- `SESSION_SECRET` - Generate a random string (use: `openssl rand -base64 32`)
- `NODE_ENV` - Set to `production`

### Step 5: Update Build Settings

In Railway, go to your service settings:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `/` (default)

### Step 6: Run Database Migrations

1. In Railway, go to your database service
2. Click "Connect" → "Query"
3. Or use Railway CLI:
```bash
railway run npx prisma migrate deploy
railway run npm run seed  # If you want to seed initial data
```

### Step 7: Handle File Uploads

**Option A: Use Railway's persistent storage** (simplest)
- Files will be stored in the `/uploads` directory
- This works but files are lost if you redeploy

**Option B: Use cloud storage** (recommended for production)
- Set up AWS S3, Google Cloud Storage, or similar
- Update upload/download code to use cloud storage
- More reliable and scalable

### Step 8: Deploy!

Railway will automatically:
- Build your app
- Deploy it
- Provide a URL (e.g., `your-app.railway.app`)
- Set up HTTPS automatically

### Step 9: Custom Domain (Optional)

1. In Railway project settings → "Settings" → "Domains"
2. Add your custom domain
3. Railway will provide DNS instructions

---

## Alternative: Render.com

Similar process to Railway:

1. Sign up at [render.com](https://render.com)
2. Create "New Web Service" → Connect GitHub
3. Select your repo
4. Add PostgreSQL database
5. Set environment variables
6. Deploy!

---

## Important Notes Before Deploying

### 1. Migrate from SQLite to PostgreSQL

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma migrate dev --name migrate_to_postgres
```

### 2. Set SESSION_SECRET

Generate a secure random secret:
```bash
openssl rand -base64 32
```

### 3. File Storage

For production, consider migrating to cloud storage:
- AWS S3
- Google Cloud Storage  
- Cloudinary
- Vercel Blob Storage

### 4. Environment Variables Needed

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for session signing
- `NODE_ENV` - Set to `production`

---

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Environment variables set
- [ ] Test login functionality
- [ ] Test file uploads
- [ ] Verify HTTPS is working
- [ ] Test on mobile devices
- [ ] Set up monitoring (optional)
- [ ] Configure backups (Railway does this automatically)

---

## Troubleshooting

### Build fails
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database connection errors
- Verify `DATABASE_URL` is set correctly
- Check database is running in Railway
- Ensure migrations have run

### File uploads not working
- Check file permissions
- Verify uploads directory exists
- Consider migrating to cloud storage

---

## Cost Estimate

**Railway**:
- Hobby plan: $5/month (includes $5 credit)
- Pro plan: $20/month (more resources)

**Render**:
- Free tier available (with limitations)
- Starter: $7/month
- Standard: $25/month

Both include:
- PostgreSQL database
- Automatic HTTPS
- Auto-deployments
- Monitoring

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

