# Deployment Guide

This guide covers deploying the Lighter Strat Analyzer to production.

## Architecture

- **Frontend:** Deployed on Vercel (static React app)
- **Backend:** Deployed on Render (Node.js API server)
- **Communication:** Frontend calls backend via tRPC over HTTPS

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Render account (free tier works)
- Repository pushed to GitHub

## Backend Deployment (Render)

### 1. Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `lighter-strat-api` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** Leave empty
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build:server`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or paid for better performance)

### 2. Environment Variables

Add these in Render's Environment tab:

```bash
NODE_ENV=production
FTC_ENABLED=true
```

### 3. Deploy

- Click **Create Web Service**
- Render will automatically build and deploy
- Note your backend URL (e.g., `https://lighter-strat-api.onrender.com`)

### 4. Keep Alive (Optional)

Free tier Render services sleep after 15 minutes of inactivity. Options:
- Upgrade to paid tier ($7/month)
- Use a service like [UptimeRobot](https://uptimerobot.com/) to ping every 14 minutes
- Accept the cold start delay (first request takes ~30s)

## Frontend Deployment (Vercel)

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 2. Environment Variables

Add these in Vercel's Settings → Environment Variables:

```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

**Important:** Replace `your-backend-url` with your actual Render backend URL.

### 3. Update API Client

In `client/src/lib/trpc-client.ts`, make sure the API URL uses the environment variable:

```typescript
const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### 4. Deploy

- Click **Deploy**
- Vercel will automatically build and deploy
- Your app will be live at `https://your-project.vercel.app`

### 5. Custom Domain (Optional)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Post-Deployment

### Enable FTC Feature

If you want FTC enabled in production:

**Backend (Render):**
1. Go to your service → Environment
2. Set `FTC_ENABLED=true`
3. Service will auto-redeploy

**Frontend:**
- No changes needed (FTC toggle will work automatically)

### Monitor Performance

**Render:**
- Check Logs tab for server errors
- Monitor Metrics for CPU/Memory usage

**Vercel:**
- Check Analytics for page views
- Monitor Speed Insights for performance

### Update Deployment

Both platforms auto-deploy on git push:

```bash
git add .
git commit -m "your changes"
git push origin main
```

- Render: Redeploys backend automatically
- Vercel: Redeploys frontend automatically

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console:

1. Check backend `server/index.ts` has CORS enabled:
```typescript
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
}));
```

2. Verify frontend is calling correct backend URL

### FTC Not Working

1. Check Render environment has `FTC_ENABLED=true`
2. Verify backend redeployed after adding env var
3. Check browser console for API errors

### Slow Cold Starts (Render Free Tier)

- First request after 15min inactivity takes ~30s
- Subsequent requests are fast
- Solution: Upgrade to paid tier or use UptimeRobot

### Build Failures

**Backend:**
- Check `package.json` has correct build script
- Verify all dependencies are in `dependencies` (not `devDependencies`)

**Frontend:**
- Ensure `VITE_API_URL` is set in Vercel
- Check build logs for TypeScript errors

## Cost Estimate

**Free Tier:**
- Vercel: Free (100GB bandwidth, unlimited projects)
- Render: Free (750 hours/month, sleeps after 15min)
- **Total: $0/month**

**Paid Tier (Recommended for Production):**
- Vercel Pro: $20/month (better performance, analytics)
- Render Starter: $7/month (no sleep, better performance)
- **Total: $27/month**

## Security Checklist

- [ ] Environment variables set correctly
- [ ] `.env` file in `.gitignore` (never commit secrets)
- [ ] CORS configured properly
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] API rate limiting in place (FTC has max 5 concurrent)

## Support

For deployment issues:
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs
- GitHub Issues: https://github.com/higherorderbit69/lighter-strat-analyzer/issues
