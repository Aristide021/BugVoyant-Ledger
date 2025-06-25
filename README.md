# BugVoyant-Ledger

Transform raw Sentry incidents into polished post-mortem Markdown, anchor SHA-256 hashes on Algorand for tamper-proof auditing, and get AI-powered audio summaries with enterprise-grade resilience.

## Features

- 🔐 **Secure Authentication** - Supabase auth with Row-Level Security
- 📊 **Real-time Dashboard** - Beautiful interface showing incident statistics
- ⚙️ **Project Configuration** - Easy setup for Sentry integration
- 🤖 **Resilient AI Gateway** - Multi-provider fallback (Gemini → OpenAI → Claude)
- ⛓️ **Blockchain Anchoring** - Immutable hash storage on Algorand
- 🎧 **Audio Summaries** - ElevenLabs TTS for 90-second incident briefs
- 📱 **Slack Integration** - Automatic notifications with rich formatting
- 🏗️ **Production Ready** - Built with modern web technologies

## Architecture

```
Sentry Webhook → Netlify Function → Supabase DB
                       ↓
         AI Gateway (Gemini/OpenAI/Claude) + Algorand + ElevenLabs
                       ↓
                 Slack Notification
```

## Resilient AI Gateway

Our multi-provider AI strategy ensures 99.9% uptime for report generation:

1. **Primary: Google Gemini 2.5 Flash** (~$0.0014/report)
   - Fastest and most cost-effective
   - Purpose-built for structured tasks

2. **Fallback #1: OpenAI GPT-4o-mini** (~$0.0021/report)
   - Industry-standard reliability
   - Proven performance at scale

3. **Fallback #2: Anthropic Claude 3 Haiku** (~$0.00375/report)
   - Ultimate resilience with third provider
   - Exceptional reasoning capabilities

If one provider fails, the system automatically falls back to the next, ensuring your incident reports are always generated.

## Quick Start

1. **Clone and Deploy**
   ```bash
   git clone [repository]
   npm install
   npm run dev
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your API keys for all three AI providers
   - Configure Supabase, ElevenLabs, and Algorand credentials

3. **Set up Database**
   - Run the Supabase migration to create tables
   - Enable Row-Level Security policies
   - Create the `audio-summaries` storage bucket

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

#### AI Provider Keys (All Required for Full Resilience)
- `GOOGLE_API_KEY` - Google Gemini API key (primary)
- `OPENAI_API_KEY` - OpenAI API key (fallback #1)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (fallback #2)

#### Additional Services
- `ELEVEN_API_KEY` - ElevenLabs API key for audio generation
- `ALGORAND_TOKEN` - Algorand node API token (optional for public nodes)
- `ALGORAND_SERVER` - Algorand node URL (default: testnet)
- `ALGORAND_MNEMONIC` - 25-word mnemonic for Algorand account

## Cost Analysis

With intelligent fallback routing, typical costs per incident report:

- **Best case (Gemini):** $0.0014
- **Fallback case (OpenAI):** $0.0021  
- **Ultimate fallback (Claude):** $0.00375

The system automatically uses the most cost-effective provider available, while maintaining enterprise-grade reliability.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Netlify Functions, Supabase
- **Database**: PostgreSQL with Row-Level Security
- **AI**: Multi-provider (Google Gemini, OpenAI, Anthropic Claude)
- **Blockchain**: Algorand
- **Audio**: ElevenLabs TTS
- **Notifications**: Slack Webhooks

## Security

- All user data is protected by Supabase Row-Level Security
- API keys are stored securely in Netlify environment variables
- Webhook signatures are verified for authenticity
- Only hash fingerprints are stored on-chain, not actual data
- Multi-provider architecture prevents vendor lock-in

## Monitoring & Observability

The system logs which AI provider was used for each report, enabling:
- Cost tracking and optimization
- Provider performance monitoring
- Automatic failover analytics
- Usage pattern insights

## License

MIT License - see LICENSE file for details