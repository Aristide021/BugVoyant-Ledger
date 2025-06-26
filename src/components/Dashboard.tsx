import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Settings, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ProjectConfig } from './ProjectConfig';
import { ReportHistory } from './ReportHistory';

interface DashboardStats {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  processingReports: number;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'reports'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    completedReports: 0,
    failedReports: 0,
    processingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const { data: reports, error } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          projects!inner(user_id)
        `)
        .eq('projects.user_id', user.id);

      if (error) throw error;

      const totalReports = reports.length;
      const completedReports = reports.filter(r => r.status === 'completed').length;
      const failedReports = reports.filter(r => r.status === 'failed').length;
      const processingReports = reports.filter(r => r.status === 'processing').length;

      setStats({
        totalReports,
        completedReports,
        failedReports,
        processingReports,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const StatCard = ({ icon: Icon, title, value, color, bgColor }: {
    icon: React.ElementType;
    title: string;
    value: number;
    color: string;
    bgColor: string;
  }) => (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{loading ? '—' : value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
      
      <div className="relative">
        {/* Header */}
        <header className="backdrop-blur-lg bg-white/10 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-white">BugVoyant-Ledger</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-slate-300 text-sm">
                  {user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="backdrop-blur-lg bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'projects', label: 'Projects', icon: Settings },
                { id: 'reports', label: 'Reports', icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    icon={FileText}
                    title="Total Reports"
                    value={stats.totalReports}
                    color="text-blue-400"
                    bgColor="bg-blue-500/20"
                  />
                  <StatCard
                    icon={CheckCircle}
                    title="Completed"
                    value={stats.completedReports}
                    color="text-green-400"
                    bgColor="bg-green-500/20"
                  />
                  <StatCard
                    icon={Clock}
                    title="Processing"
                    value={stats.processingReports}
                    color="text-yellow-400"
                    bgColor="bg-yellow-500/20"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    title="Failed"
                    value={stats.failedReports}
                    color="text-red-400"
                    bgColor="bg-red-500/20"
                  />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="text-slate-400">
                  <p>Your incident reports and blockchain anchoring activity will appear here.</p>
                  <p className="mt-2 text-sm">Configure your first project to get started.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && <ProjectConfig />}
          
          {activeTab === 'reports' && <ReportHistory />}
        </main>
      </div>
    </div>
  );
}