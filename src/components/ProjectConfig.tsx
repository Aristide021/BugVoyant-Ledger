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
  HelpCircle
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
    // In a real implementation, you might check if the user has set up encryption
    // For now, we'll prompt them to set it up
    const hasKey = localStorage.getItem('encryption_key_set') === 'true';
    setEncryptionKeySet(hasKey);
    if (!hasKey) {
      setShowEncryptionSetup(true);
    }
  };

  const setupEncryption = async () => {
    try {
      const key = await encryptionService.generateEncryptionKey();
      localStorage.setItem('encryption_key_set', 'true');
      setEncryptionKeySet(true);
      setShowEncryptionSetup(false);
      
      // In a real implementation, you'd want to securely store this key
      // or derive it from user credentials
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
      
      // Fetch secret statuses for each project
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
    if (!encryptionKeySet) {
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
        // Update existing project
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
        // Create new project
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

      // Store encrypted secrets
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
          <div className="bg-slate-800 rounded-xl border border-slate-600 max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Security Setup Required</h3>
            </div>
            
            <p className="text-slate-300 mb-6">
              To securely store your API keys and tokens, we need to set up client-side encryption. 
              This ensures your sensitive data is encrypted before being stored in the database.
            </p>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-400 font-medium mb-1">How it works</h4>
                  <p className="text-slate-300 text-sm">
                    A unique encryption key is generated for your session. All sensitive data is encrypted 
                    client-side before being sent to our servers. Only you can decrypt your data.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={setupEncryption}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Set Up Encryption
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-white">Project Configuration</h2>
          {encryptionKeySet && (
            <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Encryption Active</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCreating(true)}
          disabled={!encryptionKeySet}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {(isCreating || editingProject) && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Production App"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sentry Organization Slug
              </label>
              <input
                type="text"
                value={formData.sentry_org_slug}
                onChange={(e) => setFormData({ ...formData, sentry_org_slug: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-org"
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Sentry Auth Token
                </label>
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div className="relative">
                <input
                  type={showSecrets.sentry_token ? 'text' : 'password'}
                  value={formData.sentry_auth_token}
                  onChange={(e) => setFormData({ ...formData, sentry_auth_token: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sntrys_..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, sentry_token: !prev.sentry_token }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showSecrets.sentry_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Slack Webhook URL
                </label>
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <div className="relative">
                <input
                  type={showSecrets.slack_webhook ? 'text' : 'password'}
                  value={formData.slack_webhook_url}
                  onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://hooks.slack.com/services/..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, slack_webhook: !prev.slack_webhook }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showSecrets.slack_webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={resetForm}
              className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
            <p className="text-slate-400 mb-4">No projects configured yet.</p>
            <p className="text-sm text-slate-500">
              Create your first project to start receiving incident reports.
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAuditLogs(project.id)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors p-2"
                    title="View audit logs"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEditing(project)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors p-2"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secret Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-slate-300">Sentry Token</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {secretStatuses[project.id]?.sentry_auth_token ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {secretStatuses[project.id]?.sentry_auth_token && (
                        <button
                          onClick={() => rotateSecret(project.id, 'sentry_auth_token')}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Rotate token"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-slate-300">Slack Webhook</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {secretStatuses[project.id]?.slack_webhook_url ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {secretStatuses[project.id]?.slack_webhook_url && (
                        <button
                          onClick={() => rotateSecret(project.id, 'slack_webhook_url')}
                          className="text-slate-400 hover:text-white transition-colors"
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
                <div className="bg-white/5 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Recent Activity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {auditLogs[project.id]?.length > 0 ? (
                      auditLogs[project.id].map((log, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                            <span className="text-slate-300">{log.action}</span>
                            <span className="text-slate-400">{log.resource_type}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs">No recent activity</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {projects.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="text-blue-400 font-medium mb-2">Webhook Configuration</h4>
            <p className="text-slate-300 text-sm mb-2">
              Configure your Sentry projects to send webhooks to:
            </p>
            <div className="flex items-center space-x-2">
              <code className="bg-black/30 px-3 py-1 rounded text-blue-300 text-sm flex-1">
                {window.location.origin}/.netlify/functions/report
              </code>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/.netlify/functions/report`, 'webhook')}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy webhook URL"
              >
                {copiedField === 'webhook' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Make sure to enable "Issue" events in your Sentry webhook configuration.
            </p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-orange-400 font-medium mb-2">Environment Setup Required</h4>
                <p className="text-slate-300 text-sm mb-2">
                  To complete the integration, ensure these environment variables are configured in Netlify:
                </p>
                <ul className="text-slate-400 text-xs space-y-1">
                  <li>• <code>ALGORAND_MNEMONIC</code> - 25-word mnemonic for Algorand account</li>
                  <li>• <code>GOOGLE_API_KEY</code> - Google Gemini API key (primary AI provider)</li>
                  <li>• <code>OPENAI_API_KEY</code> - OpenAI API key (fallback #1)</li>
                  <li>• <code>ANTHROPIC_API_KEY</code> - Anthropic Claude API key (fallback #2)</li>
                  <li>• <code>ELEVEN_API_KEY</code> - ElevenLabs API key for audio generation</li>
                  <li>• <code>SENTRY_WEBHOOK_SECRET</code> - Secret for webhook signature verification</li>
                </ul>
                <p className="text-slate-400 text-xs mt-2">
                  Also ensure the Supabase storage bucket "audio-summaries" is created and configured.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}