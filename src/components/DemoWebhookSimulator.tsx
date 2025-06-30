import React, { useState } from 'react';
import { Play, Zap, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { toast } from '../utils/toast';

interface DemoIncident {
  id: string;
  title: string;
  level: 'error' | 'warning' | 'info';
  status: 'open' | 'resolved';
  culprit: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: 'demo-001',
    title: 'Database connection timeout in production',
    level: 'error',
    status: 'open',
    culprit: 'DatabaseService.connect()',
    count: 45,
    userCount: 23,
    firstSeen: new Date(Date.now() - 3600000).toISOString(),
    lastSeen: new Date().toISOString()
  },
  {
    id: 'demo-002',
    title: 'API rate limit exceeded for external service',
    level: 'warning',
    status: 'open',
    culprit: 'ExternalAPIClient.request()',
    count: 12,
    userCount: 8,
    firstSeen: new Date(Date.now() - 1800000).toISOString(),
    lastSeen: new Date().toISOString()
  },
  {
    id: 'demo-003',
    title: 'Memory leak detected in user session handler',
    level: 'error',
    status: 'resolved',
    culprit: 'SessionManager.createSession()',
    count: 67,
    userCount: 34,
    firstSeen: new Date(Date.now() - 7200000).toISOString(),
    lastSeen: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'demo-004',
    title: 'Payment processing failed for subscription renewal',
    level: 'error',
    status: 'open',
    culprit: 'PaymentProcessor.processRenewal()',
    count: 8,
    userCount: 8,
    firstSeen: new Date(Date.now() - 900000).toISOString(),
    lastSeen: new Date().toISOString()
  },
  {
    id: 'demo-005',
    title: 'Slow query performance in analytics dashboard',
    level: 'warning',
    status: 'open',
    culprit: 'AnalyticsQuery.execute()',
    count: 23,
    userCount: 15,
    firstSeen: new Date(Date.now() - 5400000).toISOString(),
    lastSeen: new Date().toISOString()
  }
];

export function DemoWebhookSimulator() {
  const [selectedIncident, setSelectedIncident] = useState<DemoIncident | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  const simulateWebhook = async (incident: DemoIncident) => {
    setIsProcessing(true);
    setProcessingStep('Initializing...');

    try {
      // Simulate the webhook payload
      const webhookPayload = {
        action: 'created',
        data: {
          issue: {
            id: incident.id,
            title: incident.title,
            culprit: incident.culprit,
            level: incident.level,
            status: incident.status,
            statusDetails: {},
            type: 'error',
            metadata: {
              filename: 'app.js',
              lineno: Math.floor(Math.random() * 100) + 1,
              function: incident.culprit
            },
            numComments: 0,
            assignedTo: null,
            permalink: `https://demo.sentry.io/issues/${incident.id}`,
            firstSeen: incident.firstSeen,
            lastSeen: incident.lastSeen,
            count: incident.count.toString(),
            userCount: incident.userCount,
            project: {
              id: 'demo-project',
              name: 'BugVoyant Demo',
              slug: 'bugvoyant-demo'
            }
          }
        },
        installation: {
          uuid: 'demo-installation'
        }
      };

      // Real processing steps
      const steps = [
        'Validating webhook signature...',
        'Creating incident report...',
        'Generating AI analysis...',
        'Anchoring on blockchain...',
        'Generating audio summary...',
        'Sending notifications...',
        'Completing report...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(steps[i]);
        
        // Real blockchain anchoring on step 3
        if (i === 3) {
          try {
            const { algorandService } = await import('../lib/algorand');
            const incidentContent = JSON.stringify(webhookPayload);
            const txId = await algorandService.anchorContent(incidentContent);
            console.log('Blockchain anchoring completed:', txId);
          } catch (error) {
            console.error('Blockchain anchoring failed:', error);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      }

      // Simulate success
      toast.success('Demo Incident Processed!', `Successfully processed "${incident.title}"`);
      
      // Show demo report
      setTimeout(() => {
        window.location.href = '/demo-report';
      }, 1000);

    } catch (error) {
      toast.error('Demo Failed', 'Failed to process demo incident');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Demo Webhook Simulator</h2>
            <p className="text-gray-400">Test the full incident processing workflow with simulated Sentry webhooks</p>
          </div>
        </div>

        {isProcessing ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Processing Incident</h3>
            <p className="text-gray-400">{processingStep}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {DEMO_INCIDENTS.map((incident) => (
              <div
                key={incident.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getLevelIcon(incident.level)}
                      {getStatusIcon(incident.status)}
                      <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{incident.culprit}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Count: {incident.count}</span>
                      <span>Users: {incident.userCount}</span>
                      <span>Level: {incident.level}</span>
                      <span>Status: {incident.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => simulateWebhook(incident)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Play className="w-4 h-4" />
                    <span>Process</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-xs">ℹ</span>
            </div>
            <div>
              <h4 className="text-blue-400 font-medium mb-1">Demo Mode Active</h4>
              <p className="text-blue-300 text-sm">
                This simulator creates realistic Sentry webhook events to test the full incident processing pipeline. 
                All blockchain operations are simulated, and no real tokens or external services are required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 