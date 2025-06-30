#!/bin/bash

echo "🚀 Setting up BugVoyant-Ledger Demo Mode..."

# Create demo environment file
cat > .env.demo << EOF
# Demo Mode Configuration - Uses Real Testnet
VITE_DEMO_MODE=true

# Algorand Testnet Configuration (Real blockchain operations)
VITE_ALGORAND_TOKEN=
VITE_ALGORAND_SERVER=https://testnet-api.algonode.cloud

# Supabase Configuration (not used in demo mode)
VITE_SUPABASE_URL=https://demo.supabase.co
VITE_SUPABASE_ANON_KEY=demo_anon_key

# OAuth Configuration (not used in demo mode)
VITE_GOOGLE_CLIENT_ID=demo_google_client_id
VITE_GITHUB_CLIENT_ID=demo_github_client_id

# AI Configuration (not used in demo mode)
VITE_GEMINI_API_KEY=demo_gemini_key
VITE_OPENAI_API_KEY=demo_openai_key
VITE_ANTHROPIC_API_KEY=demo_anthropic_key

# ElevenLabs Configuration (not used in demo mode)
VITE_ELEVENLABS_API_KEY=demo_elevenlabs_key

# Slack Configuration (not used in demo mode)
VITE_SLACK_BOT_TOKEN=demo_slack_token
VITE_SLACK_SIGNING_SECRET=demo_slack_secret

# Sentry Configuration (not used in demo mode)
VITE_SENTRY_WEBHOOK_SECRET=demo_sentry_secret
EOF

echo "✅ Demo environment file created: .env.demo"
echo ""
echo "📋 To run in demo mode:"
echo "1. Copy .env.demo to .env: cp .env.demo .env"
echo "2. Start the development server: npm run dev"
echo "3. Visit http://localhost:5173/demo to try the webhook simulator"
echo ""
echo "🎯 Demo Features:"
echo "- Real Sentry webhook simulation"
echo "- Actual blockchain anchoring on Algorand testnet"
echo "- Real transaction verification"
echo "- AI analysis simulation"
echo "- Audio summary simulation"
echo "- Full incident report workflow"
echo ""
echo "🔗 Demo URLs:"
echo "- Webhook Simulator: http://localhost:5173/demo"
echo "- Demo Report: http://localhost:5173/demo-report"
echo ""
echo ""
echo "🔧 Setup Instructions:"
echo "1. Copy .env.demo to .env: cp .env.demo .env"
echo "2. Start the development server: npm run dev"
echo "3. Visit http://localhost:5173/demo to try the webhook simulator"
echo ""
echo "💡 Optional: Add your Nodely API token to .env for higher rate limits"
echo ""
echo "✨ Demo mode uses real Algorand testnet operations!" 