# SmartCart Pro — Railway Deployment Guide

## Step 1 — Create Railway Account
Go to https://railway.app and sign up with GitHub.

## Step 2 — Create a New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub and select your smartcart-pro repo

## Step 3 — Add PostgreSQL Database
1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL instance automatically
4. Click on the PostgreSQL service → "Variables" tab
5. Copy the `DATABASE_URL` value — it looks like:
   postgresql://postgres:password@hostname.railway.app:5432/railway

## Step 4 — Set Environment Variables
In your Railway app service → "Variables" tab, add these:

```
DATABASE_URL=postgresql://postgres:...  (from Step 3)
SHOPIFY_API_KEY=your_api_key            (from Shopify Partners dashboard)
SHOPIFY_API_SECRET=your_api_secret      (from Shopify Partners dashboard)
SHOPIFY_APP_URL=https://your-app.railway.app
SCOPES=write_products,write_metaobjects,write_metaobject_definitions,read_orders,write_orders
NODE_ENV=production
```

## Step 5 — Update shopify.app.toml
Replace application_url and redirect_urls with your Railway URL:

```toml
application_url = "https://your-app.railway.app"

[auth]
redirect_urls = [ "https://your-app.railway.app/api/auth" ]
```

## Step 6 — Add railway.json config
Already created at railway.json in your project root.

## Step 7 — Deploy
Railway auto-deploys on every git push. Just push your code:
```bash
git add .
git commit -m "deploy to railway"
git push
```

## Step 8 — Run Migrations on Railway
After first deploy, run the migration in Railway's shell:
```bash
npx prisma migrate deploy
```
Or add it to your build command (already done in railway.json).

## Step 9 — Update Shopify App URL
1. Go to Shopify Partners dashboard
2. Your app → "App setup"
3. Update "App URL" to your Railway URL
4. Update "Allowed redirection URLs"
5. Run: shopify app deploy
