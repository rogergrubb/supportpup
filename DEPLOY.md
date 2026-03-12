# SupportPup — Vercel Deployment Guide
## Number One Son Software Development

---

## Architecture (Why This Is Secure)

```
User's Browser                 Vercel Edge              Anthropic API
─────────────────              ─────────────            ──────────────
index.html          ──POST──►  /api/chat.js  ──POST──►  claude-sonnet
(zero keys)         userText   (key in env)   with key   (AI response)
                    ◄──JSON──               ◄──JSON──
```

The API key **never leaves Vercel's servers.** The browser only ever sees `/api/chat`.

---

## One-Time Setup (10 minutes)

### Step 1 — Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2 — Login
```bash
vercel login
```
Follow the browser prompt to authenticate.

### Step 3 — Deploy from the supportpup folder
```bash
cd supportpup
vercel
```
Answer the prompts:
- Set up and deploy? → **Y**
- Which scope? → your account
- Link to existing project? → **N**
- Project name? → **supportpup** (or your choice)
- Directory? → **./** (current directory)

Vercel will give you a preview URL like `https://supportpup-abc123.vercel.app`

### Step 4 — Add the API Key as an Environment Variable

**Option A: Via CLI (fastest)**
```bash
vercel env add ANTHROPIC_API_KEY
```
When prompted for value, paste your key. Select: Production, Preview, Development.

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Click your project → **Settings** → **Environment Variables**
3. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `[your key]`
   - Environments: ✅ Production ✅ Preview ✅ Development

### Step 5 — Redeploy with the env var active
```bash
vercel --prod
```

Your live URL will be: `https://supportpup.vercel.app` (or custom domain)

---

## Custom Domain (Optional)

```bash
vercel domains add supportpup.com
```
Then update your DNS with the CNAME Vercel gives you.

---

## File Structure

```
supportpup/
├── index.html          ← The entire PWA frontend
├── sw.js               ← Service worker (offline support)
├── manifest.json       ← PWA install metadata
├── vercel.json         ← Routing + security headers
└── api/
    └── chat.js         ← Edge function proxy (key lives here via env)
```

---

## Security Checklist

- [x] API key in env variable, never in code
- [x] Key never sent to client
- [x] CORS locked to your domains
- [x] Input length limited to 2000 chars
- [x] Security headers on all responses
- [x] No-store cache on API route
- [x] Edge runtime (fast + no cold starts)

---

## Cost Estimate at Scale

| Users/day | Sessions | Tokens est. | Anthropic cost |
|-----------|----------|-------------|----------------|
| 100       | 200      | ~60K        | ~$0.18/day     |
| 1,000     | 2,000    | ~600K       | ~$1.80/day     |
| 10,000    | 20,000   | ~6M         | ~$18/day       |

At $9.99/mo subscription, **break-even is ~60 active users.** 
At 10K users → **$99,900/mo revenue vs ~$540/mo AI cost = 99.5% margin.**

---

## Next Steps (I'm Building These)

- [ ] Rate limiting per IP (protect from abuse)
- [ ] Stripe subscription integration
- [ ] Analytics dashboard (sessions, distress trends, tool popularity)
- [ ] Landing page (TalkToMyDog.com / SupportPup.com)
