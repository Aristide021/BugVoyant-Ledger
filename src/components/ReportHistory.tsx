import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Play, 
  Pause, 
  Volume2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Download,
  Copy,
  Filter,
  Search,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';

interface Report {
  id: number;
  title: string;
  markdown: string;
  algorand_tx: string | null;
  audio_url: string | null;
  status: 'processing' | 'completed' | 'failed' | 'partial' | 'pending_hash' | 'text_only';
  created_at: string;
  sentry_issue_id: string;
  projects: {
    name: string;
    sentry_org_slug: string;
  };
}

interface ReportStats {
  totalReports: number;
  avgProcessingTime: number;
  successRate: number;
  costSavings: number;
}

export function ReportHistory() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const calculateStats = useCallback((reportsData: Report[]) => {
    const totalReports = reportsData.length;
    const completedReports = reportsData.filter(r => r.status === 'completed').length;
    const successRate = totalReports > 0 ? (completedReports / totalReports) * 100 : 0;
    const costSavings = completedReports * 200; // $200 per manual post-mortem
    const avgProcessingTime = 25; // Average processing time in seconds

    setStats({
      totalReports,
      avgProcessingTime,
      successRate,
      costSavings
    });
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          projects (
            name,
            sentry_org_slug
          )
        `)
        .eq('projects.user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, calculateStats]);

  const filterReports = useCallback(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projects.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(report => 
          new Date(report.created_at) >= filterDate
        );
      }
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter, dateFilter]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'pending_hash':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'text_only':
        return <FileText className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'partial':
        return 'Partial';
      case 'pending_hash':
        return 'Pending Hash';
      case 'text_only':
        return 'Text Only';
      default:
        return 'Unknown';
    }
  };

  const playAudio = (audioUrl: string, reportId: number) => {
    if (playingAudio === audioUrl) {
      const audio = document.getElementById(`audio-${reportId}`) as HTMLAudioElement;
      audio?.pause();
      setPlayingAudio(null);
    } else {
      const audio = document.getElementById(`audio-${reportId}`) as HTMLAudioElement;
      if (audio) {
        audio.play();
        setPlayingAudio(audioUrl);
      }
    }
  };

  const exportReport = (report: Report, format: 'markdown' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'markdown') {
      content = report.markdown;
      filename = `incident-report-${report.id}.md`;
      mimeType = 'text/markdown';
    } else {
      content = JSON.stringify({
        id: report.id,
        title: report.title,
        markdown: report.markdown,
        status: report.status,
        created_at: report.created_at,
        project: report.projects.name,
        sentry_issue_id: report.sentry_issue_id,
        algorand_tx: report.algorand_tx,
        audio_url: report.audio_url
      }, null, 2);
      filename = `incident-report-${report.id}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Incident Reports</h2>
            <p className="text-gray-400">AI-generated post-mortem reports with blockchain verification</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <div className="text-gray-400 text-sm bg-gray-800 px-3 py-2 rounded-xl">
            {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showStats && stats && (
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Report Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-gray-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.totalReports}</div>
              <div className="text-gray-400 text-sm">Total Reports</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{stats.successRate.toFixed(1)}%</div>
              <div className="text-gray-400 text-sm">Success Rate</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-400">{stats.avgProcessingTime}s</div>
              <div className="text-gray-400 text-sm">Avg Processing</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">${stats.costSavings.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Cost Savings</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all duration-200"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all duration-200"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
              className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {reports.length === 0 ? 'No incident reports yet' : 'No reports match your filters'}
          </h3>
          <p className="text-gray-400">
            {reports.length === 0 
              ? 'Reports will appear here when Sentry webhooks are triggered.'
              : 'Try adjusting your search criteria or filters.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(report.status)}
                    <h3 
                      className="text-lg font-semibold text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                      onClick={() => setSelectedReport(report)}
                    >
                      {report.title}
                    </h3>
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-lg">
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center space-x-1">
                      <span>Project:</span>
                      <span className="text-white">{report.projects.name}</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 flex-wrap gap-2">
                    {report.audio_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(report.audio_url!, report.id);
                        }}
                        className="flex items-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        {playingAudio === report.audio_url ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>Audio Summary</span>
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    {report.algorand_tx && (
                      <a
                        href={`https://testnet.explorer.algorand.org/transaction/${report.algorand_tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Nodely Blockchain Proof</span>
                      </a>
                    )}
                    
                    <a
                      href={`https://${report.projects.sentry_org_slug}.sentry.io/issues/${report.sentry_issue_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center space-x-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-2 rounded-lg transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View in Sentry</span>
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportReport(report, 'markdown');
                      }}
                      className="flex items-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-2 rounded-lg transition-all duration-200"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(report.markdown, `report-${report.id}`);
                      }}
                      className="flex items-center space-x-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 px-3 py-2 rounded-lg transition-all duration-200"
                    >
                      {copiedField === `report-${report.id}` ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {report.audio_url && (
                <audio
                  id={`audio-${report.id}`}
                  src={report.audio_url}
                  onEnded={() => setPlayingAudio(null)}
                  onPause={() => setPlayingAudio(null)}
                  className="hidden"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal with Secure Markdown Rendering */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1419] border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                {getStatusIcon(selectedReport.status)}
                <h3 className="text-xl font-semibold text-white">{selectedReport.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportReport(selectedReport, 'markdown')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title="Export as Markdown"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => copyToClipboard(selectedReport.markdown, 'modal')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  title="Copy to clipboard"
                >
                  {copiedField === 'modal' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  className="text-gray-300 leading-relaxed"
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-5 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-white mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="my-2 text-gray-300">{children}</p>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    code: ({ children }) => <code className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-blue-300 text-sm">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto">{children}</pre>,
                    ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 space-y-1 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => (
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-2">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 bg-blue-500/10 pl-4 py-2 my-4 italic">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {selectedReport.markdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}