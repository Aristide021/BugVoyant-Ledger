# OAuth Provider Setup Guide

This guide explains how to enable Google and GitHub OAuth authentication in your Supabase project.

## Prerequisites

- Access to your Supabase Dashboard
- Google Cloud Console account (for Google OAuth)
- GitHub account (for GitHub OAuth)

## 1. Google OAuth Setup

### Step 1: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local development)
7. Save and copy the Client ID and Client Secret

### Step 2: Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Find "Google" and toggle it on
4. Enter your Google Client ID and Client Secret
5. Save the configuration

## 2. GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: "BugVoyant-Ledger"
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Register the application
5. Copy the Client ID and generate a Client Secret

### Step 2: Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Find "GitHub" and toggle it on
4. Enter your GitHub Client ID and Client Secret
5. Save the configuration

## 3. Update Your Application

Once you've configured the OAuth providers in Supabase, update the `checkOAuthProviders` function in `AuthForm.tsx`:

```typescript
const checkOAuthProviders = async () => {
  // Enable the providers you've configured
  setOauthEnabled({ 
    google: true,  // Set to true if you've configured Google
    github: true   // Set to true if you've configured GitHub
  });
};
```

## 4. Environment Variables

Make sure your environment variables are set correctly:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Testing

1. Start your development server
2. Navigate to the authentication page
3. Try signing in with Google and/or GitHub
4. Verify that users are created in your Supabase Auth dashboard

## Troubleshooting

### Common Issues

1. **"Provider is not enabled" error**
   - Ensure the provider is enabled in Supabase Dashboard
   - Check that Client ID and Secret are correctly entered
   - Verify the redirect URLs match exactly

2. **Redirect URI mismatch**
   - Ensure the callback URL in your OAuth app matches the Supabase callback URL
   - Format: `https://your-project-ref.supabase.co/auth/v1/callback`

3. **CORS issues**
   - Add your domain to the allowed origins in your OAuth app settings
   - Ensure your Supabase project allows your domain

### Production Deployment

When deploying to production:

1. Update OAuth app redirect URIs to include your production domain
2. Update the `redirectTo` URL in your `signInWithOAuth` calls
3. Ensure environment variables are set in your production environment

## Security Considerations

- Never expose Client Secrets in client-side code
- Use HTTPS in production
- Regularly rotate OAuth credentials
- Monitor authentication logs for suspicious activity
- Consider implementing rate limiting for authentication endpoints

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)