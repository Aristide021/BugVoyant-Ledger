import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Settings, 
  Webhook, 
  MessageSquare,
  X,
  ChevronRight,
  Zap
} from 'lucide-react';

interface GettingStartedGuideProps {
  onClose: () => void;
}

export function GettingStartedGuide({ onClose }: GettingStartedGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const webhookUrl = `${window.location.origin}/.netlify/functions/enhanced-report`;

  const steps = [
    {
      title: "Create Your First Project",
      icon: Settings,
      description: "Set up a project to connect your Sentry organization",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Start by creating a project in BugVoyant-Ledger. This will store your Sentry configuration and webhook settings.
          </p>
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
            <h4 className="text-blue-400 font-medium mb-2">What you'll need:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Sentry organization slug (e.g., "my-company")</li>
              <li>• Sentry auth token (from your Sentry settings)</li>
              <li>• Slack webhook URL (optional, for notifications)</li>
            </ul>
          </div>
          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Click "Projects" in the sidebar to get started</span>
          </div>
        </div>
      )
    },
    {
      title: "Configure Sentry Webhook",
      icon: Webhook,
      description: "Connect your Sentry project to BugVoyant-Ledger",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Configure your Sentry project to send webhooks to BugVoyant-Ledger when new issues are created.
          </p>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-white font-medium mb-3">Webhook URL:</h4>
            <div className="flex items-center space-x-3 bg-gray-900/50 rounded-lg p-3">
              <code className="text-blue-300 text-sm flex-1 font-mono break-all">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                title="Copy webhook URL"
              >
                {copiedField === 'webhook' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-orange-600/10 border border-orange-600/20 rounded-xl p-4">
            <h4 className="text-orange-400 font-medium mb-2">Sentry Setup Steps:</h4>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Go to your Sentry project settings</li>
              <li>Navigate to "Webhooks" section</li>
              <li>Click "Create New Webhook"</li>
              <li>Paste the webhook URL above</li>
              <li>Enable "Issue" events</li>
              <li>Save the webhook configuration</li>
            </ol>
          </div>

          <a
            href="https://docs.sentry.io/product/integrations/integration-platform/webhooks/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Sentry Webhook Documentation</span>
          </a>
        </div>
      )
    },
    {
      title: "Set Up Slack Notifications",
      icon: MessageSquare,
      description: "Get notified when reports are generated (optional)",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Configure Slack notifications to get instant alerts when incident reports are generated.
          </p>
          
          <div className="bg-green-600/10 border border-green-600/20 rounded-xl p-4">
            <h4 className="text-green-400 font-medium mb-2">Slack Webhook Setup:</h4>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Go to your Slack workspace</li>
              <li>Create a new Slack app or use an existing one</li>
              <li>Enable "Incoming Webhooks"</li>
              <li>Create a webhook for your desired channel</li>
              <li>Copy the webhook URL to your project settings</li>
            </ol>
          </div>

          <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
            <h4 className="text-blue-400 font-medium mb-2">What you'll get:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Rich notifications with incident details</li>
              <li>• Direct links to Sentry issues</li>
              <li>• Blockchain proof links</li>
              <li>• Audio summary links</li>
              <li>• Processing metrics and costs</li>
            </ul>
          </div>

          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Slack Webhook Documentation</span>
          </a>
        </div>
      )
    },
    {
      title: "Test Your Setup",
      icon: Zap,
      description: "Verify everything is working correctly",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Test your configuration by triggering a test incident in Sentry.
          </p>
          
          <div className="bg-purple-600/10 border border-purple-600/20 rounded-xl p-4">
            <h4 className="text-purple-400 font-medium mb-2">Testing Steps:</h4>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Create a test error in your application</li>
              <li>Verify the issue appears in Sentry</li>
              <li>Check that a report is generated in BugVoyant-Ledger</li>
              <li>Confirm Slack notification is received (if configured)</li>
            </ol>
          </div>

          <div className="bg-green-600/10 border border-green-600/20 rounded-xl p-4">
            <h4 className="text-green-400 font-medium mb-2">What to expect:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• AI-generated post-mortem report</li>
              <li>• Blockchain hash for audit trail</li>
              <li>• Audio summary (90 seconds)</li>
              <li>• Processing time under 30 seconds</li>
              <li>• Cost tracking and metrics</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">You're all set! Start monitoring your incidents with AI-powered insights.</span>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1419] border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Getting Started Guide</h2>
              <p className="text-gray-400 text-sm">Set up your first incident monitoring project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-400">{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-4 overflow-x-auto">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <step.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{step.title}</span>
                {index < currentStep && <CheckCircle className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <currentStepData.icon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{currentStepData.title}</h3>
              <p className="text-gray-400 text-sm">{currentStepData.description}</p>
            </div>
          </div>
          
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Previous</span>
          </button>
          
          <div className="flex items-center space-x-3">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Get Started</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}