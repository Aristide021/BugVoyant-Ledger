import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  Hash, 
  Play, 
  Pause,
  Volume2,
  ExternalLink,
  Copy,
  Download,
  Share2,
  Eye,
  BarChart3,
  Zap,
  Link,
  FileText,
  Mic,
  Brain
} from 'lucide-react';
import { algorandService } from '../lib/algorand';
import { toast } from '../utils/toast';

interface DemoReportData {
  incidentId: string;
  title: string;
  level: 'error' | 'warning' | 'info';
  status: 'open' | 'resolved';
  culprit: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  blockchainTxId: string;
  aiAnalysis: string;
  audioUrl?: string;
  recommendations: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  rootCause: string;
  timeline: Array<{
    timestamp: string;
    event: string;
    description: string;
  }>;
}

const DEMO_REPORT: DemoReportData = {
  incidentId: 'demo-001',
  title: 'Database connection timeout in production',
  level: 'error',
  status: 'open',
  culprit: 'DatabaseService.connect()',
  count: 45,
  userCount: 23,
  firstSeen: new Date(Date.now() - 3600000).toISOString(),
  lastSeen: new Date().toISOString(),
  blockchainTxId: 'demo_8f4a2b1c_3d5e6f7g_' + Date.now().toString(36),
  aiAnalysis: `This database connection timeout error is occurring in the production environment and affecting 23 users across 45 incidents. The error originates in the DatabaseService.connect() method, which is failing to establish connections within the configured timeout period.

Analysis indicates this is likely caused by:
1. Database server overload during peak usage hours
2. Network connectivity issues between application and database servers
3. Connection pool exhaustion due to improper connection management

The incident has been active for 1 hour and shows no signs of resolution, requiring immediate attention.`,
  severity: 'high',
  impact: 'User authentication and data retrieval operations are failing, affecting core application functionality.',
  rootCause: 'Database connection pool exhaustion combined with increased load during peak hours.',
  recommendations: [
    'Increase database connection pool size from 10 to 25 connections',
    'Implement connection retry logic with exponential backoff',
    'Add database health monitoring and alerting',
    'Consider implementing read replicas to distribute load',
    'Review and optimize database queries for performance'
  ],
  timeline: [
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      event: 'First Occurrence',
      description: 'Initial database connection timeout detected'
    },
    {
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      event: 'Escalation',
      description: 'Error count reached threshold, incident escalated'
    },
    {
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      event: 'AI Analysis',
      description: 'Automated analysis completed and report generated'
    },
    {
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      event: 'Blockchain Anchoring',
      description: 'Incident report anchored on Algorand blockchain'
    },
    {
      timestamp: new Date(Date.now() - 600000).toISOString(),
      event: 'Audio Summary',
      description: 'Voice summary generated for incident report'
    },
    {
      timestamp: new Date().toISOString(),
      event: 'Current Status',
      description: 'Incident remains active, investigation ongoing'
    }
  ]
};

export function DemoReport() {
  const [report, setReport] = useState<DemoReportData>(DEMO_REPORT);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');
  const [isDemoMode] = useState(true);

  useEffect(() => {
    // Real blockchain verification
    const verifyBlockchain = async () => {
      try {
        const { algorandService } = await import('../lib/algorand');
        const result = await algorandService.verifyHashAnchoring(report.blockchainTxId, 'demo_hash');
        
        if (result.success && result.verified) {
          setVerificationStatus('verified');
          toast.success('Blockchain Verification', 'Incident report successfully verified on Algorand blockchain');
        } else {
          setVerificationStatus('failed');
          toast.error('Blockchain Verification Failed', 'Could not verify incident report on blockchain');
        }
      } catch (error) {
        console.error('Blockchain verification failed:', error);
        setVerificationStatus('failed');
        toast.error('Blockchain Verification Failed', 'Error verifying incident report');
      }
    };

    verifyBlockchain();
  }, [report.blockchainTxId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'high':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-400" />;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!', `${label} copied to clipboard`);
  };

  const toggleAudio = () => {
    setIsAudioPlaying(!isAudioPlaying);
    if (!isAudioPlaying) {
      toast.info('Audio Demo', 'Audio summary would play here in a real implementation');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {getLevelIcon(report.level)}
              <h1 className="text-3xl font-bold text-white">{report.title}</h1>
            </div>
            <p className="text-gray-400 text-lg">{report.culprit}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(report.severity)}`}>
              {report.severity.toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-600/10 text-blue-400 border border-blue-600/20">
              DEMO MODE
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-gray-400 text-sm">Total Incidents</p>
                <p className="text-2xl font-bold text-white">{report.count}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">Affected Users</p>
                <p className="text-2xl font-bold text-white">{report.userCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-gray-400 text-sm">Duration</p>
                <p className="text-2xl font-bold text-white">1h</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="text-2xl font-bold text-white capitalize">{report.status}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Analysis */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">AI Analysis</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">{report.aiAnalysis}</p>
            </div>

            {/* Impact & Root Cause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3">Impact</h4>
                <p className="text-gray-300">{report.impact}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3">Root Cause</h4>
                <p className="text-gray-300">{report.rootCause}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Recommendations</h4>
              <ul className="space-y-3">
                {report.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Timeline</h4>
              <div className="space-y-4">
                {report.timeline.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-white font-medium">{event.event}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Blockchain Verification */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Hash className="w-5 h-5 text-green-400" />
                <h4 className="text-lg font-semibold text-white">Blockchain Verification</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Status:</span>
                  <div className="flex items-center space-x-2">
                    {verificationStatus === 'verified' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {verificationStatus === 'pending' && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
                    <span className={`text-sm font-medium ${
                      verificationStatus === 'verified' ? 'text-green-400' : 
                      verificationStatus === 'failed' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {verificationStatus === 'verified' ? 'Verified' : 
                       verificationStatus === 'failed' ? 'Failed' : 'Verifying...'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Transaction ID:</span>
                  <button
                    onClick={() => copyToClipboard(report.blockchainTxId, 'Transaction ID')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <code className="text-xs text-gray-300 break-all">{report.blockchainTxId}</code>
                </div>
                
                <button
                  onClick={() => window.open(algorandService.getExplorerUrl(report.blockchainTxId), '_blank')}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-lg px-3 py-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Explorer</span>
                </button>
              </div>
            </div>

            {/* Audio Summary */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Mic className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-semibold text-white">Audio Summary</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleAudio}
                    className="flex items-center justify-center w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
                  >
                    {isAudioPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-400 h-2 rounded-full" style={{ width: isAudioPlaying ? '45%' : '0%' }}></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm">
                  {isAudioPlaying ? 'Playing audio summary...' : 'Click to play incident summary'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Actions</h4>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-4 py-2 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share Report</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span>View Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 