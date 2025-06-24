# BugVoyant-Ledger

Transform raw Sentry incidents into polished post-mortem Markdown, anchor SHA-256 hashes on Algorand for tamper-proof auditing, and get AI-powered audio summaries.

## Features

- 🔐 **Secure Authentication** - Supabase auth with Row-Level Security
- 📊 **Real-time Dashboard** - Beautiful interface showing incident statistics
- ⚙️ **Project Configuration** - Easy setup for Sentry integration
- 🤖 **AI-Powered Summaries** - GPT-4o-mini generates professional post-mortems
- ⛓️ **Blockchain Anchoring** - Immutable hash storage on Algorand
- 🎧 **Audio Summaries** - ElevenLabs TTS for 90-second incident briefs
- 📱 **Slack Integration** - Automatic notifications with rich formatting
- 🏗️ **Production Ready** - Built with modern web technologies

## Architecture

```
Sentry Webhook → Netlify Function → Supabase DB
                       ↓
              OpenAI + Algorand + ElevenLabs
                       ↓
                 Slack Notification
```

## Quick Start

1. **Clone and Deploy**
   ```bash
   git clone [repository]
   npm install
   npm run dev
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase, OpenAI, ElevenLabs, and Algorand credentials

3. **Set up Database**
   - Run the Supabase migration to create tables
   - Enable Row-Level Security policies

4. **Configure Sentry**
   - Add webhook URL: `https://your-site.netlify.app/.netlify/functions/report`
   - Enable "Issue" events

## Environment Variables

### Client-side (.env)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Server-side (Netlify)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS
- `SENTRY_WEBHOOK_SECRET` - Secret for webhook signature verification
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini
- `ELEVEN_API_KEY` - ElevenLabs API key for audio generation
- `ALGORAND_TOKEN` - Algorand node API token
- `ALGORAND_SERVER` - Algorand node URL (default: testnet)

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Netlify Functions, Supabase
- **Database**: PostgreSQL with Row-Level Security
- **AI**: OpenAI GPT-4o-mini
- **Blockchain**: Algorand
- **Audio**: ElevenLabs TTS
- **Notifications**: Slack Webhooks

## Security

- All user data is protected by Supabase Row-Level Security
- API keys are stored securely in Netlify environment variables
- Webhook signatures are verified for authenticity
- Only hash fingerprints are stored on-chain, not actual data

## License

MIT License - see LICENSE file for details