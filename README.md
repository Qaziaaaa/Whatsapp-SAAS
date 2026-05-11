# WhatsApp CRM SaaS

A production-ready AI WhatsApp CRM for small businesses. Connect your WhatsApp Business account, auto-reply with AI, manage leads, and track conversations — all from a modern dashboard.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL (Supabase) · Clerk · Groq AI · Socket.io

---

## Features

- **WhatsApp Integration** — Receive and send messages via Meta WhatsApp Cloud API
- **AI Auto-Reply** — Groq-powered instant replies in English and Urdu
- **CRM Lead Management** — Auto-create leads, track status, assign agents
- **Real-Time Dashboard** — Live message updates via Socket.io
- **Multi-Tenant** — Complete data isolation per organization
- **Role-Based Access** — Owner, Admin, and Agent roles

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier)
- A [Clerk](https://clerk.com) account (free tier)
- A [Groq](https://console.groq.com) account (free tier)
- A [Meta Developer](https://developers.facebook.com) account with WhatsApp Business API access
- A [Railway](https://railway.app) or [Render](https://render.com) account for the Socket.io server

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Qaziaaaa/Whatsapp-SAAS.git
cd Whatsapp-SAAS/whatsapp-crm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in each variable (see comments in `.env.example` for guidance):

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (Transaction pooler, port 6543) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection string (Direct connection, port 5432) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `SOCKET_SERVER_URL` | Your Railway/Render deployment URL |
| `SOCKET_SERVER_SECRET` | Any random string (min 32 chars) |
| `ENCRYPTION_KEY` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `WEBHOOK_VERIFY_TOKEN` | Any string you choose — you'll enter this in Meta Developer Console |
| `NEXT_APP_URL` | Your Vercel deployment URL (or `http://localhost:3000` for dev) |

### 4. Set up the database

Run Prisma migrations to create all tables:

```bash
npx prisma migrate deploy
```

Generate the Prisma client:

```bash
npx prisma generate
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 6. Start the Socket.io server (for real-time updates)

In a separate terminal:

```bash
cd socket-server
npm install
npm run dev
```

The Socket.io server runs on port 3001 by default.

---

## WhatsApp Setup

1. Go to [Meta Developer Console](https://developers.facebook.com) → Your App → WhatsApp → Configuration
2. Set the **Webhook URL** to: `https://your-app.vercel.app/api/webhooks/whatsapp`
3. Set the **Verify Token** to the value of your `WEBHOOK_VERIFY_TOKEN` env var
4. Subscribe to the **messages** webhook field
5. In the dashboard Settings page, enter your WhatsApp credentials (Phone Number ID, Access Token, App Secret)

---

## Deployment

### Next.js App → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

### Socket.io Server → Railway

1. Push the `socket-server/` directory to a separate repo (or use a monorepo setup)
2. Create a new Railway project and connect the repo
3. Set environment variables: `PORT`, `SOCKET_SERVER_SECRET`, `CLERK_SECRET_KEY`, `NEXT_APP_URL`
4. Railway will auto-deploy using the `Dockerfile`

---

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Project Structure

```
whatsapp-crm/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── (auth)/             # Sign-in and sign-up pages
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   └── api/                # API route handlers
│   ├── components/             # React components
│   │   ├── inbox/              # Chat interface components
│   │   ├── shared/             # Shared UI components
│   │   └── ui/                 # shadcn/ui primitives
│   ├── lib/                    # Core utilities
│   │   ├── auth.ts             # Clerk auth context helper
│   │   ├── crypto.ts           # AES-256-GCM encryption
│   │   ├── groq.ts             # Groq AI client
│   │   ├── pipeline.ts         # WhatsApp message pipeline
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── rate-limit.ts       # Rate limiter
│   │   ├── socket-emitter.ts   # Socket.io event emitter
│   │   └── whatsapp.ts         # Meta WhatsApp API client
│   ├── schemas/                # Zod validation schemas
│   ├── store/                  # Zustand state store
│   ├── hooks/                  # React hooks
│   └── actions/                # Next.js Server Actions
├── prisma/
│   └── schema.prisma           # Database schema
└── socket-server/              # Standalone Socket.io server
    └── src/
        ├── index.ts            # Server entry point
        └── middleware/
            └── auth.ts         # Clerk JWT verification
```

---

## Architecture Notes

- **Why a separate Socket.io server?** Vercel serverless functions can't hold persistent WebSocket connections. The Socket.io server runs on Railway as a persistent Node.js process.
- **Why Supabase port 6543?** Vercel can spawn many concurrent function instances. Port 6543 uses PgBouncer (connection pooler) to prevent database connection exhaustion.
- **Why encrypt WhatsApp credentials?** Each org stores its own API credentials. They're encrypted with AES-256-GCM before being written to the database.
- **Why always return 200 to Meta?** If Meta receives a non-200 response, it retries the webhook — creating duplicate records. All errors are logged internally.
