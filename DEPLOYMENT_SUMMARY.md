# 📦 Vercel Deployment - Quick Reference

## 🎯 What's Been Set Up

Your project is now ready for Vercel deployment with a monorepo structure:

```
TEST/
├── api/index.ts              # ✅ Serverless API functions
├── frontend/                 # ✅ SvelteKit frontend (Vercel adapter)
├── backend/                  # ✅ Backend code (used by API)
├── vercel.json              # ✅ Vercel configuration
├── package.json             # ✅ Root package.json
├── .vercelignore            # ✅ Files to exclude
└── VERCEL_DEPLOYMENT.md     # ✅ Full guide
```

## ⚡ Quick Deploy (3 Steps)

### 1️⃣ Install Vercel CLI
```bash
npm install -g vercel
```

### 2️⃣ Login
```bash
vercel login
```

### 3️⃣ Deploy
```bash
vercel --prod
```

## 🔑 Required Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Where to Get It |
|----------|----------------|
| `DATABASE_URL` | PostgreSQL connection string from [Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres |
| `GEMINI_API_KEY` | Get from [Google AI Studio](https://makersuite.google.com/app/apikey) |

## 📁 Files Created/Modified

### New Files
- ✅ `api/index.ts` - Serverless API handler
- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` (root) - Monorepo package.json
- ✅ `.vercelignore` - Exclude files from deployment
- ✅ `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- ✅ `deploy-setup.ps1` - Windows setup script
- ✅ `SEQUENTIAL_MODEL_FALLBACK.md` - Model fallback documentation

### Modified Files
- ✅ `frontend/package.json` - Added `@sveltejs/adapter-vercel`
- ✅ `frontend/svelte.config.js` - Changed adapter to Vercel
- ✅ `frontend/src/lib/api.ts` - Production API URLs
- ✅ `backend/src/gemini.ts` - Sequential model fallback
- ✅ `backend/src/server.ts` - CORS and favicon fixes

## 🏗️ Architecture

### Development
```
Frontend (5173) → Backend (3001) → Database + Gemini API
```

### Production (Vercel)
```
Frontend (Vercel Edge)
    ↓
API (/api/*) → Serverless Functions → Database + Gemini API
```

## 🚀 Deployment Methods

### Method 1: Vercel CLI (Recommended)
```bash
vercel --prod
```

### Method 2: GitHub Integration
1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Auto-deploy on every push

## 🔄 How It Works

### Frontend
- Built with SvelteKit
- Deployed to Vercel Edge Network (CDN)
- Static files cached globally
- Fast page loads worldwide

### Backend API
- Express app converted to serverless functions
- Located in `/api/index.ts`
- Routes: `/api/health`, `/api/chat/message`, `/api/chat/history/:id`
- Auto-scales with traffic

### Database
- PostgreSQL (recommend Neon or Vercel Postgres)
- Connection pooling handled automatically
- Tables: `conversations`, `messages`, `faqs`

### AI Models
- 10 Gemini models in fallback chain
- Automatic rate limit detection
- Switches to next model if rate limited
- Falls back to FAQ responses if all models exhausted

## 🧪 Testing Deployment

Once deployed to `https://your-app.vercel.app`:

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Test frontend
# Open https://your-app.vercel.app in browser
```

## 📊 What Happens During Deployment

1. **Build Phase**
   - Installs dependencies
   - Builds frontend with SvelteKit
   - Compiles TypeScript for API
   
2. **Deploy Phase**
   - Frontend → Vercel Edge Network
   - API → Serverless functions
   - Environment variables injected
   
3. **Ready!**
   - Your app is live
   - SSL automatically configured
   - Custom domain ready (optional)

## 🔍 Monitoring

### View Logs
```bash
vercel logs your-app.vercel.app --follow
```

### Check Which Model is Used
Logs will show:
```
✓ Using model: gemini-2.5-flash-lite
✓ Successfully generated response using gemini-2.5-flash-lite
```

### Rate Limit Switching
```
⚠️  Model gemini-2.5-flash-lite has been rate limited
Rate limit hit for gemini-2.5-flash-lite, trying next model...
✓ Using model: gemini-2.5-flash-tts
```

## 💡 Pro Tips

1. **Database Setup**: Run `npm run db:setup` with production DATABASE_URL before first deployment
2. **Preview Deployments**: Every branch push creates a preview URL
3. **Rollback**: Instant rollback in Vercel dashboard if issues occur
4. **Custom Domain**: Add in Vercel dashboard → Settings → Domains
5. **Analytics**: Free analytics available in Vercel dashboard

## 🐛 Common Issues

### Build Fails
- Check Node version (requires 18+)
- Verify all dependencies in `package.json`
- Clear build cache in Vercel

### API Errors
- Verify environment variables are set
- Check database connection string
- View function logs in Vercel dashboard

### CORS Issues
- API accepts all origins in production
- Check API logs for actual error
- Verify frontend is making requests to correct URL

## 📚 Resources

- **Full Guide**: `VERCEL_DEPLOYMENT.md`
- **Model Fallback**: `SEQUENTIAL_MODEL_FALLBACK.md`
- **Vercel Docs**: https://vercel.com/docs
- **SvelteKit Docs**: https://kit.svelte.dev

## ✅ Pre-Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Database tables set up (`npm run db:setup`)
- [ ] `DATABASE_URL` ready
- [ ] `GEMINI_API_KEY` obtained
- [ ] Vercel CLI installed
- [ ] Logged into Vercel
- [ ] Code tested locally
- [ ] Ready to deploy! 🚀

## 🎉 You're Ready!

Everything is configured for Vercel deployment. Just run:

```bash
vercel --prod
```

And your app will be live! 🌟

---

**Questions?** Check `VERCEL_DEPLOYMENT.md` for detailed instructions.

