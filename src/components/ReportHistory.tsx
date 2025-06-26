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
  Share2,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, dateFilter]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          projects!inner(name, sentry_org_slug, user_id)
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
  };

  const calculateStats = (reportsData: Report[]) => {
    const totalReports = reportsData.length;
    const completedReports = reportsData.filter(r => r.status === 'completed').length;
    const successRate = totalReports > 0 ? (completedReports / totalReports) * 100 : 0;
    
    // Estimate cost savings (assuming manual post-mortem takes 2 hours at $100/hour)
    const costSavings = completedReports * 200;
    
    // Calculate average processing time (mock data for demo)
    const avgProcessingTime = 25; // seconds

    setStats({
      totalReports,
      avgProcessingTime,
      successRate,
      costSavings
    });
  };

  const filterReports = () => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projects.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Date filter
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
  };

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
        return <FileText className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
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

  const shareReport = async (report: Report) => {
    const shareData = {
      title: `Incident Report: ${report.title}`,
      text: `Post-mortem report for ${report.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      copyToClipboard(window.location.href, 'share');
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Incident Reports</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <div className="text-slate-400 text-sm">
            {filteredReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showStats && stats && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Report Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalReports}</div>
              <div className="text-slate-400 text-sm">Total Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.successRate.toFixed(1)}%</div>
              <div className="text-slate-400 text-sm">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.avgProcessingTime}s</div>
              <div className="text-slate-400 text-sm">Avg Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">${stats.costSavings.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">Cost Savings</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">
            {reports.length === 0 ? 'No incident reports yet.' : 'No reports match your filters.'}
          </p>
          <p className="text-sm text-slate-500">
            {reports.length === 0 
              ? 'Reports will appear here when Sentry webhooks are triggered.'
              : 'Try adjusting your search criteria or filters.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(report.status)}
                    <h3 
                      className="text-lg font-semibold text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                      onClick={() => setSelectedReport(report)}
                    >
                      {report.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-400 mb-3">
                    <span>Project: {report.projects.name}</span>
                    <span>•</span>
                    <span>{new Date(report.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(report.status)}
                      <span>{getStatusLabel(report.status)}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 flex-wrap gap-2">
                    {report.audio_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(report.audio_url!, report.id);
                        }}
                        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
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
                        href={`https://explorer.algorand.org/transaction/${report.algorand_tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Blockchain Proof</span>
                      </a>
                    )}
                    
                    <a
                      href={`https://${report.projects.sentry_org_slug}.sentry.io/issues/${report.sentry_issue_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View in Sentry</span>
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportReport(report, 'markdown');
                      }}
                      className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(report.markdown, `report-${report.id}`);
                      }}
                      className="flex items-center space-x-2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {copiedField === `report-${report.id}` ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareReport(report);
                      }}
                      className="flex items-center space-x-2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
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

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-600 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-600">
              <div className="flex items-center space-x-3">
                {getStatusIcon(selectedReport.status)}
                <h3 className="text-xl font-semibold text-white">{selectedReport.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportReport(selectedReport, 'markdown')}
                  className="text-slate-400 hover:text-white transition-colors p-2"
                  title="Export as Markdown"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => copyToClipboard(selectedReport.markdown, 'modal')}
                  className="text-slate-400 hover:text-white transition-colors p-2"
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
                  className="text-slate-400 hover:text-white transition-colors p-2"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                  {selectedReport.markdown}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}