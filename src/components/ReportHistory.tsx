import React, { useState, useEffect } from 'react';
import { FileText, Play, Pause, Volume2, ExternalLink, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
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

export function ReportHistory() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

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
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
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
      // Pause current audio
      const audio = document.getElementById(`audio-${reportId}`) as HTMLAudioElement;
      audio?.pause();
      setPlayingAudio(null);
    } else {
      // Play new audio
      const audio = document.getElementById(`audio-${reportId}`) as HTMLAudioElement;
      if (audio) {
        audio.play();
        setPlayingAudio(audioUrl);
      }
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
        <div className="text-slate-400 text-sm">
          {reports.length} report{reports.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No incident reports yet.</p>
          <p className="text-sm text-slate-500">
            Reports will appear here when Sentry webhooks are triggered.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(report.status)}
                    <h3 className="text-lg font-semibold text-white truncate">{report.title}</h3>
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
                  
                  <div className="flex items-center space-x-4">
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
              <h3 className="text-xl font-semibold text-white">{selectedReport.title}</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
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