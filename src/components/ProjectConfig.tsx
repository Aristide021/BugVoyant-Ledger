import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  sentry_auth_token: string;
  sentry_org_slug: string;
  slack_webhook_url: string;
  created_at: string;
}

export function ProjectConfig() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sentry_auth_token: '',
    sentry_org_slug: '',
    slack_webhook_url: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            sentry_auth_token: formData.sentry_auth_token,
            sentry_org_slug: formData.sentry_org_slug,
            slack_webhook_url: formData.slack_webhook_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert({
            user_id: user!.id,
            name: formData.name,
            sentry_auth_token: formData.sentry_auth_token,
            sentry_org_slug: formData.sentry_org_slug,
            slack_webhook_url: formData.slack_webhook_url,
          });

        if (error) throw error;
      }

      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

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

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      sentry_auth_token: project.sentry_auth_token,
      sentry_org_slug: project.sentry_org_slug,
      slack_webhook_url: project.slack_webhook_url,
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Project Configuration</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div>
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
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sentry Auth Token
              </label>
              <input
                type="password"
                value={formData.sentry_auth_token}
                onChange={(e) => setFormData({ ...formData, sentry_auth_token: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sntrys_..."
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={formData.slack_webhook_url}
                onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://hooks.slack.com/services/..."
              />
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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Organization: {project.sentry_org_slug}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    <a
                      href={`https://${project.sentry_org_slug}.sentry.io/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View in Sentry</span>
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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
            <code className="bg-black/30 px-3 py-1 rounded text-blue-300 text-sm">
              {window.location.origin}/.netlify/functions/report
            </code>
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
                  <li>• <code>OPENAI_API_KEY</code> - OpenAI API key for GPT-4o-mini</li>
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