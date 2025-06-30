import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Settings, FileText, LogOut, Plus, TrendingUp, Users, Zap, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ProjectConfig } from './ProjectConfig';
import { ReportHistory } from './ReportHistory';
import { GettingStartedGuide } from './GettingStartedGuide';

interface DashboardStats {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  processingReports: number;
  totalCostSavings: number;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'reports'>('overview');
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    completedReports: 0,
    failedReports: 0,
    processingReports: 0,
    totalCostSavings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch reports data
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          projects!inner(user_id)
        `)
        .eq('projects.user_id', user.id);

      if (reportsError) throw reportsError;

      // Fetch cost data for current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: costs, error: costsError } = await supabase
        .from('cost_tracking')
        .select('cost_cents')
        .eq('user_id', user.id)
        .eq('billing_period', currentMonth);

      if (costsError) {
        console.warn('Could not fetch cost data:', costsError);
      }

      const totalReports = reports?.length || 0;
      const completedReports = reports?.filter(r => r.status === 'completed').length || 0;
      const failedReports = reports?.filter(r => r.status === 'failed').length || 0;
      const processingReports = reports?.filter(r => r.status === 'processing').length || 0;
      
      // Calculate cost savings: completed reports * $200 (manual cost) - actual AI costs
      const actualCosts = costs?.reduce((sum, cost) => sum + cost.cost_cents, 0) || 0;
      const manualCosts = completedReports * 20000; // $200 in cents
      const totalCostSavings = Math.max(0, (manualCosts - actualCosts) / 100); // Convert to dollars

      setStats({
        totalReports,
        completedReports,
        failedReports,
        processingReports,
        totalCostSavings,
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

  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#0f1419] border-r border-gray-800 min-h-screen flex flex-col">
          {/* Logo */}
          <div className="p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Activity className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Projects</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Reports</span>
              </button>
            </div>
          </nav>

          {/* Upgrade Section */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 mb-4">
              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 transition-all duration-200">
                Upgrade to Pro
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400">Free Plan</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Welcome, {userName}</h1>
                  <p className="text-gray-400">Monitor and analyze your incident reports with AI-powered insights.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('projects')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-600/25"
                >
                  New Project
                </button>
                <button 
                  onClick={() => setShowGettingStarted(true)}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Getting Started</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{loading ? '—' : stats.totalReports}</div>
                  <div className="text-gray-400 text-sm">Total Reports</div>
                  <div className="flex items-center space-x-2 mt-3">
                    <div className="text-green-400 text-sm">↗ {stats.completedReports > 0 ? Math.round((stats.completedReports / stats.totalReports) * 100) : 0}%</div>
                    <div className="text-gray-500 text-xs">success rate</div>
                  </div>
                </div>

                <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{loading ? '—' : stats.completedReports}</div>
                  <div className="text-gray-400 text-sm">Completed Reports</div>
                  <div className="flex items-center space-x-2 mt-3">
                    <div className="text-green-400 text-sm">↗ 99.9%</div>
                    <div className="text-gray-500 text-xs">AI uptime</div>
                  </div>
                </div>

                <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    ${loading ? '—' : stats.totalCostSavings.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">Cost Savings</div>
                  <div className="flex items-center space-x-2 mt-3">
                    <div className="text-green-400 text-sm">↗ 99.9%</div>
                    <div className="text-gray-500 text-xs">vs manual process</div>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
                    <button 
                      onClick={() => setActiveTab('reports')}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      View all
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-gray-400 text-center py-8">Loading activity...</div>
                    ) : stats.totalReports === 0 ? (
                      <div className="text-gray-400 text-center py-8">
                        <div className="space-y-3">
                          <p>No activity yet. Configure a project to start receiving reports.</p>
                          <button
                            onClick={() => setShowGettingStarted(true)}
                            className="text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
                          >
                            Need help getting started?
                          </button>
                        </div>
                      </div>
                    ) : (
                      [
                        { action: 'Generated new report', time: '3 minutes ago', status: 'completed' },
                        { action: 'Generated new report', time: '2 hours ago', status: 'completed' },
                        { action: 'Generated new report', time: '1 day ago', status: 'processing' },
                        { action: 'Generated new report', time: '2 days ago', status: 'completed' },
                      ].slice(0, Math.min(4, stats.totalReports)).map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.status === 'completed' ? 'bg-green-400' : 
                              activity.status === 'processing' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className="text-white">{activity.action}</span>
                          </div>
                          <span className="text-gray-400 text-sm">{activity.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>Select project...</option>
                        <option>Production App</option>
                        <option>Staging Environment</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>Select type...</option>
                        <option>Incident Report</option>
                        <option>Performance Analysis</option>
                      </select>
                    </div>
                    
                    <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-600/25">
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="p-8">
              <ProjectConfig />
            </div>
          )}
          
          {activeTab === 'reports' && (
            <div className="p-8">
              <ReportHistory />
            </div>
          )}
        </div>
      </div>
      
      {/* Getting Started Guide Modal */}
      {showGettingStarted && (
        <GettingStartedGuide onClose={() => setShowGettingStarted(false)} />
      )}
    </div>
  );
}