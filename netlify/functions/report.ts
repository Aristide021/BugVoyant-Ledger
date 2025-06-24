import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import algosdk from 'algosdk';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SENTRY_WEBHOOK_SECRET = process.env.SENTRY_WEBHOOK_SECRET!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY!;
const ALGORAND_TOKEN = process.env.ALGORAND_TOKEN!;
const ALGORAND_SERVER = process.env.ALGORAND_SERVER || 'https://testnet-api.algonode.cloud';
const ALGORAND_MNEMONIC = process.env.ALGORAND_MNEMONIC!;

// Initialize Supabase client with service role key for bypassing RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Algorand client
const algodClient = new algosdk.Algodv2(ALGORAND_TOKEN, ALGORAND_SERVER, '');

interface SentryWebhookEvent {
  action: string;
  data: {
    issue: {
      id: string;
      title: string;
      culprit: string;
      level: string;
      status: string;
      statusDetails: any;
      type: string;
      metadata: any;
      numComments: number;
      assignedTo: any;
      permalink: string;
      firstSeen: string;
      lastSeen: string;
      count: string;
      userCount: number;
      project: {
        id: string;
        name: string;
        slug: string;
      };
    };
  };
  installation: {
    uuid: string;
  };
}

interface Project {
  id: string;
  name: string;
  sentry_auth_token: string;
  sentry_org_slug: string;
  slack_webhook_url: string;
  user_id: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify Sentry webhook signature
    const signature = event.headers['x-sentry-hook-signature'];
    if (!signature) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing signature' }),
      };
    }

    const body = event.body || '';
    const expectedSignature = createHmac('sha256', SENTRY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    const webhookData: SentryWebhookEvent = JSON.parse(body);
    
    // Only process issue events
    if (webhookData.action !== 'created' && webhookData.action !== 'resolved') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Event ignored' }),
      };
    }

    const issue = webhookData.data.issue;
    
    // Find the project by Sentry project slug
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .ilike('sentry_org_slug', `%${issue.project.slug}%`)
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      console.error('Project not found:', issue.project.slug);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    const project: Project = projects[0];

    // Create initial report record
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        project_id: project.id,
        sentry_issue_id: issue.id,
        title: issue.title,
        markdown: 'Processing...',
        status: 'processing',
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Failed to create report:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create report' }),
      };
    }

    // Process the incident asynchronously
    processIncident(project, issue, report.id).catch(console.error);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Webhook received, processing incident',
        reportId: report.id 
      }),
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function processIncident(project: Project, issue: any, reportId: number) {
  let status: string = 'processing';
  let markdown = '';
  let algorandTx: string | null = null;
  let audioUrl: string | null = null;

  try {
    // Step 1: Fetch detailed issue information from Sentry
    const issueDetails = await fetchSentryIssue(project, issue.id);
    
    // Step 2: Generate markdown summary using OpenAI
    markdown = await generateMarkdownSummary(issueDetails);
    
    // Step 3: Hash the markdown and anchor on Algorand
    try {
      algorandTx = await anchorOnAlgorand(markdown);
    } catch (error) {
      console.error('Algorand anchoring failed:', error);
      status = 'pending_hash';
    }
    
    // Step 4: Generate audio summary
    try {
      audioUrl = await generateAudioSummary(markdown, reportId);
    } catch (error) {
      console.error('Audio generation failed:', error);
      status = status === 'pending_hash' ? 'partial' : 'text_only';
    }
    
    // Step 5: Update report with results
    const finalStatus = status === 'processing' ? 'completed' : status;
    
    await supabase
      .from('reports')
      .update({
        markdown,
        algorand_tx: algorandTx,
        audio_url: audioUrl,
        status: finalStatus,
      })
      .eq('id', reportId);
    
    // Step 6: Send Slack notification
    await sendSlackNotification(project, issue, markdown, algorandTx, audioUrl);
    
  } catch (error) {
    console.error('Processing failed:', error);
    
    // Update report with error status
    await supabase
      .from('reports')
      .update({
        markdown: markdown || `# Processing Failed\n\nAn error occurred while processing this incident:\n\n${error}`,
        status: 'failed',
      })
      .eq('id', reportId);
  }
}

async function fetchSentryIssue(project: Project, issueId: string) {
  const response = await fetch(
    `https://sentry.io/api/0/organizations/${project.sentry_org_slug}/issues/${issueId}/`,
    {
      headers: {
        'Authorization': `Bearer ${project.sentry_auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Sentry API error: ${response.status}`);
  }

  return response.json();
}

async function generateMarkdownSummary(issueDetails: any): Promise<string> {
  const systemPrompt = `You are a senior SRE expert. Transform the following Sentry incident data into a polished post-mortem report in Markdown format. Include:

1. Executive Summary
2. Timeline of Events
3. Root Cause Analysis
4. Impact Assessment
5. Resolution Steps
6. Action Items for Prevention

Keep it professional, concise, and actionable.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(issueDetails, null, 2) },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Failed to generate summary';
}

async function anchorOnAlgorand(markdown: string): Promise<string> {
  try {
    // Generate SHA-256 hash of the markdown
    const encoder = new TextEncoder();
    const data = encoder.encode(markdown);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Recover account from mnemonic
    const account = algosdk.mnemonicToSecretKey(ALGORAND_MNEMONIC);
    
    // Get suggested transaction parameters
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Create a 0-ALGO payment transaction with hash as note
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr, // Send to self for 0-amount anchoring
      amount: 0,
      note: new Uint8Array(Buffer.from(hashHex, 'hex')),
      suggestedParams,
    });

    // Sign the transaction
    const signedTxn = txn.signTxn(account.sk);
    
    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    return txId;
  } catch (error) {
    console.error('Algorand transaction failed:', error);
    throw error;
  }
}

async function generateAudioSummary(markdown: string, reportId: number): Promise<string> {
  try {
    // Extract key points from markdown for audio summary
    const audioText = markdown
      .replace(/#+\s/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('- '))
      .slice(0, 10) // Limit to first 10 lines
      .join('. ');

    // Generate audio using ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_API_KEY,
      },
      body: JSON.stringify({
        text: audioText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get the audio stream
    const audioBuffer = await response.arrayBuffer();
    const audioFile = new Uint8Array(audioBuffer);
    
    // Upload to Supabase Storage
    const fileName = `report_${reportId}_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-summaries')
      .upload(fileName, audioFile, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Supabase Storage error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-summaries')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Audio generation failed:', error);
    throw error;
  }
}

async function sendSlackNotification(
  project: Project,
  issue: any,
  markdown: string,
  algorandTx: string | null,
  audioUrl: string | null
) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Incident Report Generated',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Project:* ${project.name}`,
        },
        {
          type: 'mrkdwn',
          text: `*Issue:* ${issue.title}`,
        },
        {
          type: 'mrkdwn',
          text: `*Level:* ${issue.level.toUpperCase()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:* ${issue.status}`,
        },
      ],
    },
  ];

  if (audioUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎧 <${audioUrl}|Listen to Audio Summary>`,
      },
    });
  }

  if (algorandTx) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⛓️ <https://testnet.explorer.perawallet.app/tx/${algorandTx}|View Blockchain Proof>`,
      },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View in Sentry',
        },
        url: issue.permalink,
        style: 'primary',
      },
    ],
  });

  await fetch(project.slack_webhook_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks,
      text: `Incident Report: ${issue.title}`,
    }),
  });
}

export { handler };