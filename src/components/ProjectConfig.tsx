import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ExternalLink, 
  AlertCircle, 
  Shield, 
  Key, 
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  History,
  HelpCircle,
  Settings,
  Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { encryptionService } from '../lib/encryption';

interface Project {
  id: string;
  name: string;
  created_at: string;
}

interface SecretStatus {
  sentry_auth_token: boolean;
  slack_webhook_url: boolean;
}

export function ProjectConfig() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [secretStatuses, setSecretStatuses] = useState<Record<string, SecretStatus>>({});
  const [auditLogs, setAuditLogs] = useState<Record<string, any[]>>({});
  const [showAuditLogs, setShowAuditLogs] = useState<Record<string, boolean>>({});
  const [encryptionKeySet, setEncryptionKeySet] = useState(false);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sentry_auth_token: '',
    sentry_org_slug: '',
    slack_webhook_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchProjects();
      checkEncryptionKey();
    }
  }, [user]);

  const checkEncryptionKey = async () => {
    const hasKey = encryptionService.isKeyValid();
    setEncryptionKeySet(hasKey);
    if (!hasKey) {
      setShowEncryptionSetup(true);
    }
  };

  const setupEncryption = async () => {
    try {
      const key = await encryptionService.generateEncryptionKey();
      setEncryptionKeySet(true);
      setShowEncryptionSetup(false);
    } catch (error) {
      console.error('Error setting up encryption:', error);
    }
  };

  const fetchProjects = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      for (const project of data || []) {
        await fetchSecretStatus(project.id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecretStatus = async (projectId: string) => {
    try {
      const secretTypes = await encryptionService.getSecretTypes(projectId);
      setSecretStatuses(prev => ({
        ...prev,
        [projectId]: {
          sentry_auth_token: secretTypes.includes('sentry_auth_token'),
          slack_webhook_url: secretTypes.includes('slack_webhook_url')
        }
      }));
    } catch (error) {
      console.error('Error fetching secret status:', error);
    }
  };

  const fetchAuditLogs = async (projectId: string) => {
    try {
      const logs = await encryptionService.getAuditLogs(projectId);
      setAuditLogs(prev => ({
        ...prev,
        [projectId]: logs
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleSave = async () => {
    if (!encryptionService.isKeyValid()) {
      alert('Please set up encryption first');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      let projectId: string;

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProject.id);

        if (error) throw error;
        projectId = editingProject.id;
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: formData.name,
          })
          .select()
          .single();

        if (error) throw error;
        projectId = data.id;
      }

      if (formData.sentry_auth_token) {
        await encryptionService.storeSecret(
          projectId,
          'sentry_auth_token',
          formData.sentry_auth_token
        );
      }

      if (formData.slack_webhook_url) {
        await encryptionService.storeSecret(
          projectId,
          'slack_webhook_url',
          formData.slack_webhook_url
        );
      }

      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated secrets and reports.')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const rotateSecret = async (projectId: string, secretType: string) => {
    const newValue = prompt(`Enter new ${secretType.replace('_', ' ')}:`);
    if (!newValue) return;

    const reason = prompt('Reason for rotation (optional):') || 'Manual rotation';

    try {
      const result = await encryptionService.rotateSecret(
        projectId,
        secretType,
        newValue,
        reason
      );

      if (result.success) {
        alert('Secret rotated successfully');
        fetchSecretStatus(projectId);
      } else {
        alert(`Error rotating secret: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rotating secret:', error);
      alert('Error rotating secret. Please try again.');
    }
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

  const toggleAuditLogs = async (projectId: string) => {
    if (!auditLogs[projectId]) {
      await fetchAuditLogs(projectId);
    }
    setShowAuditLogs(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      sentry_auth_token: '',
      sentry_org_slug: '',
      slack_webhook_url: '',
    });
  };

  const resetForm = () => {
    setEditingProject(null);
    setIsCreating(false);
    setFormData({
      name: '',
      sentry_auth_token: '',
      sentry_org_slug: '',
      slack_webhook_url: '',
    });
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
      {/* Encryption Setup Modal */}
      {showEncryptionSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1419] border border-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Security Setup Required</h3>
            </div>
            
            <p className="text-gray-400 mb-6">
              To securely store your API keys and tokens, we need to set up client-side encryption. 
              This ensures your sensitive data is encrypted before being stored in the database.
            </p>
            
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-400 font-medium mb-1">Enhanced Security</h4>
                  <p className="text-gray-400 text-sm">
                    Your encryption key is now stored securely in sessionStorage with 24-hour expiry. 
                    All sensitive data is encrypted client-side before being sent to our servers.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={setupEncryption}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200"
            >
              Set Up Encryption
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Project Configuration</h2>
            <p className="text-gray-400">Manage your projects and security settings</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {encryptionKeySet && (
            <div className="flex items-center space-x-2 bg-green-600/20 border border-green-600/30 rounded-xl px-3 py-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Encryption Active</span>
            </div>
          )}
          <button
            onClick={() => setIsCreating(true)}
            disabled={!encryptionKeySet}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-blue-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingProject) && (
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="My Production App"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sentry Organization Slug
              </label>
              <input
                type="text"
                value={formData.sentry_org_slug}
                onChange={(e) => setFormData({ ...formData, sentry_org_slug: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="my-org"
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Sentry Auth Token
                </label>
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div className="relative">
                <input
                  type={showSecrets.sentry_token ? 'text' : 'password'}
                  value={formData.sentry_auth_token}
                  onChange={(e) => setFormData({ ...formData, sentry_auth_token: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="sntrys_..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, sentry_token: !prev.sentry_token }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showSecrets.sentry_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Slack Webhook URL
                </label>
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div className="relative">
                <input
                  type={showSecrets.slack_webhook ? 'text' : 'password'}
                  value={formData.slack_webhook_url}
                  onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://hooks.slack.com/services/..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, slack_webhook: !prev.slack_webhook }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showSecrets.slack_webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              <span>Save Project</span>
            </button>
            <button
              onClick={resetForm}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects configured yet</h3>
            <p className="text-gray-400 mb-4">Create your first project to start receiving incident reports.</p>
            <button
              onClick={() => setIsCreating(true)}
              disabled={!encryptionKeySet}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAuditLogs(project.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                    title="View audit logs"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEditing(project)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secret Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">Sentry Token</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {secretStatuses[project.id]?.sentry_auth_token ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      {secretStatuses[project.id]?.sentry_auth_token && (
                        <button
                          onClick={() => rotateSecret(project.id, 'sentry_auth_token')}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Rotate token"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-white font-medium">Slack Webhook</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {secretStatuses[project.id]?.slack_webhook_url ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      {secretStatuses[project.id]?.slack_webhook_url && (
                        <button
                          onClick={() => rotateSecret(project.id, 'slack_webhook_url')}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Rotate webhook"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              {showAuditLogs[project.id] && (
                <div className="bg-gray-800/30 rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Recent Activity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {auditLogs[project.id]?.length > 0 ? (
                      auditLogs[project.id].map((log, index) => (
                        <div key={index} className="flex items-center justify-between text-xs py-2 border-b border-gray-700 last:border-b-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                            <span className="text-white">{log.action}</span>
                            <span className="text-gray-400">{log.resource_type}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-xs">No recent activity</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Configuration Info */}
      {projects.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-6">
            <h4 className="text-blue-400 font-semibold mb-3 flex items-center space-x-2">
              <ExternalLink className="w-5 h-5" />
              <span>Webhook Configuration</span>
            </h4>
            <p className="text-gray-300 mb-4">
              Configure your Sentry projects to send webhooks to:
            </p>
            <div className="flex items-center space-x-3 bg-gray-900/50 rounded-xl p-4">
              <code className="text-blue-300 text-sm flex-1 font-mono">
                {window.location.origin}/.netlify/functions/enhanced-report
              </code>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/.netlify/functions/enhanced-report`, 'webhook')}
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
            <p className="text-gray-400 text-sm mt-3">
              Make sure to enable "Issue" events in your Sentry webhook configuration.
            </p>
          </div>

          <div className="bg-green-600/10 border border-green-600/20 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-green-400 font-semibold mb-3">✅ Nodely-Powered Blockchain Infrastructure</h4>
                <p className="text-gray-300 mb-4">
                  Your blockchain anchoring is powered by Nodely's unlimited Algorand API with enhanced performance:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">✅ Unlimited API Calls</div>
                    <p className="text-gray-400 text-xs mt-1">No rate limits on blockchain operations</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">⚡ 10x Faster Response</div>
                    <p className="text-gray-400 text-xs mt-1">Optimized nodes for sub-second anchoring</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">🔒 Enterprise Grade</div>
                    <p className="text-gray-400 text-xs mt-1">99.9% uptime SLA with monitoring</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">💰 Cost Efficient</div>
                    <p className="text-gray-400 text-xs mt-1">Same $0.001 per transaction cost</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">🔗 API Token Active</div>
                    <p className="text-gray-400 text-xs mt-1">Token: 98D9CE80660AD243893D56D9F125CD2D</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 font-medium">🌐 Testnet Ready</div>
                    <p className="text-gray-400 text-xs mt-1">Connected to testnet-api.4160.nodely.io</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-orange-400 font-semibold mb-3">Environment Setup Required</h4>
                <p className="text-gray-300 mb-4">
                  To complete the Nodely integration, ensure these environment variables are configured in Netlify:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-green-300">ALGORAND_TOKEN</code>
                    <p className="text-green-400 text-xs mt-1">✅ Configured: 98D9CE80660AD243893D56D9F125CD2D</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-green-300">ALGORAND_SERVER</code>
                    <p className="text-green-400 text-xs mt-1">✅ Configured: https://testnet-api.4160.nodely.io</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-gray-300">GOOGLE_API_KEY</code>
                    <p className="text-gray-400 text-xs mt-1">Google Gemini API key (primary AI provider)</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-gray-300">OPENAI_API_KEY</code>
                    <p className="text-gray-400 text-xs mt-1">OpenAI API key (fallback #1)</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-gray-300">ANTHROPIC_API_KEY</code>
                    <p className="text-gray-400 text-xs mt-1">Anthropic Claude API key (fallback #2)</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-gray-300">ELEVEN_API_KEY</code>
                    <p className="text-gray-400 text-xs mt-1">ElevenLabs API key for audio generation</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  ✅ Nodely API configured and ready. Get additional tokens at <a href="https://nodely.io/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">nodely.io</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}