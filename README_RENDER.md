# 🚀 Quick Start: Deploy to Render.com

## Your Session Secret (Save This!)
```
VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=
```

## 5-Minute Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push
```

### 2. Sign Up & Deploy
1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **"New +"** → **"PostgreSQL"**
   - Name: `streamlined-transfers-db`
   - Plan: **Free**
   - Click **"Create Database"**
   - **Copy the Internal Database URL**

3. Click **"New +"** → **"Web Service"**
   - Connect your GitHub repo
   - Name: `streamlined-transfers`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: **Free**

4. Add Environment Variables:
   - `DATABASE_URL` = (Internal Database URL from step 2)
   - `SESSION_SECRET` = `VcgPbIWUBeMozk8jU1FdbkhaNZggCFZaouSKWqZ8cwA=`
   - `NODE_ENV` = `production`

5. Click **"Create Web Service"**

### 3. Run Migrations
After deployment, in your Web Service:
- Click **"Shell"** tab
- Run: `npx prisma migrate deploy`
- Run: `npm run seed` (optional)

### 4. Done! 🎉
Visit: `https://your-app-name.onrender.com`

---

## Cost
- **First 90 days: FREE** 🎉
- **After 90 days: $7/month** (just for database)

---

## Full Guide
See `DEPLOY_RENDER.md` for detailed instructions.

