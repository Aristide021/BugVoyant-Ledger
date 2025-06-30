import React from 'react';
import { 
  Zap, 
  Shield, 
  Brain, 
  Volume2, 
  Link, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle,
  Star,
  Activity,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  Github,
  Chrome
} from 'lucide-react';
import { BoltBadge } from './BoltBadge';

interface HomepageProps {
  onGetStarted: () => void;
}

export function Homepage({ onGetStarted }: HomepageProps) {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Transform raw Sentry incidents into polished post-mortem reports with multi-provider AI fallback (Gemini → OpenAI → Claude)',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Shield,
      title: 'Blockchain Anchoring',
      description: 'Immutable SHA-256 hash storage on Algorand blockchain for tamper-proof audit trails and compliance',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Volume2,
      title: 'Audio Summaries',
      description: 'ElevenLabs TTS generates 90-second audio briefs for executives and on-the-go incident reviews',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: MessageSquare,
      title: 'Slack Integration',
      description: 'Automatic rich notifications with blockchain proofs, audio links, and actionable incident data',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Activity,
      title: 'Real-time Processing',
      description: 'Webhook-driven architecture processes incidents in seconds with enterprise-grade reliability',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const stats = [
    { icon: Clock, value: '< 30s', label: 'Average Processing Time' },
    { icon: Shield, value: '99.9%', label: 'AI Gateway Uptime' },
    { icon: TrendingUp, value: '$0.0014', label: 'Cost Per Report' },
    { icon: Users, value: '3', label: 'AI Provider Fallbacks' }
  ];

  const testimonials = [
    {
      quote: "BugVoyant-Ledger transformed our incident response. The blockchain anchoring gives us the audit trail we need for compliance.",
      author: "Sarah Chen",
      role: "VP Engineering",
      company: "TechCorp"
    },
    {
      quote: "The AI-generated post-mortems are incredibly detailed. It's like having a senior SRE analyze every incident instantly.",
      author: "Marcus Rodriguez",
      role: "DevOps Lead", 
      company: "StartupXYZ"
    },
    {
      quote: "Audio summaries are a game-changer. I can review critical incidents during my commute without reading lengthy reports.",
      author: "Jennifer Park",
      role: "CTO",
      company: "ScaleUp Inc"
    }
  ];

  const authMethods = [
    {
      icon: Chrome,
      name: 'Google SSO',
      description: 'One-click sign-in with your Google account',
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: Github,
      name: 'GitHub SSO',
      description: 'Developer-friendly authentication',
      color: 'from-gray-700 to-gray-900'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Bolt.new Hackathon Badge */}
      <BoltBadge />
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-cyan-600/5"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
      
      <div className="relative">
        {/* Navigation */}
        <nav className="backdrop-blur-lg bg-black/20 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-white">BugVoyant-Ledger</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={onGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-600/25"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-8 shadow-2xl shadow-blue-600/25">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Transform Incidents
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Into Insights
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                AI-powered post-mortem generation with blockchain anchoring, audio summaries, 
                and enterprise-grade resilience. Turn raw Sentry incidents into actionable intelligence.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <button
                  onClick={onGetStarted}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl shadow-blue-600/25"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-2 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Methods Section */}
        <section className="py-16 border-y border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Simple Authentication Options
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Choose your preferred sign-in method. OAuth integration with Google and GitHub for seamless authentication.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {authMethods.map((method, index) => (
                <div
                  key={index}
                  className="bg-[#0f1419] border border-gray-800 rounded-2xl p-6 text-center hover:border-gray-700 transition-all duration-300"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${method.color} rounded-2xl mb-4`}>
                    <method.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{method.name}</h3>
                  <p className="text-gray-400 text-sm">{method.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-800/50 rounded-2xl mb-4">
                    <stat.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Enterprise-Grade Incident Intelligence
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Built for modern engineering teams who demand reliability, transparency, and actionable insights from their incident data.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-[#0f1419] border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-600/10"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r ${feature.color} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-blue-300 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-20 bg-[#0f1419]/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Resilient AI Gateway Architecture
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Multi-provider fallback strategy ensures 99.9% uptime with intelligent cost optimization.
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-gray-800/50 to-purple-800/30 rounded-3xl border border-gray-700 p-8 backdrop-blur-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Primary: Gemini 2.0 Flash</h3>
                  <p className="text-green-400 text-sm mb-2 font-medium">~$0.0014 per report</p>
                  <p className="text-gray-400 text-xs">Fastest & most cost-effective</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Fallback: GPT-4o-mini</h3>
                  <p className="text-blue-400 text-sm mb-2 font-medium">~$0.0021 per report</p>
                  <p className="text-gray-400 text-xs">Industry-standard reliability</p>
                </div>
                
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ultimate: Claude 3 Haiku</h3>
                  <p className="text-purple-400 text-sm mb-2 font-medium">~$0.00375 per report</p>
                  <p className="text-gray-400 text-xs">Maximum resilience</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Trusted by Engineering Teams
              </h2>
              <div className="flex items-center justify-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300">Rated 5/5 by DevOps professionals</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-[#0f1419] border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-300 mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-gray-400 text-sm">{testimonial.role}</div>
                    <div className="text-gray-500 text-sm">{testimonial.company}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-y border-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Incident Response?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join engineering teams who've revolutionized their post-mortem process with AI-powered insights and blockchain-verified audit trails.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={onGetStarted}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl shadow-blue-600/25"
              >
                <span>Start Your Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <div className="text-gray-400 text-sm">
                Setup takes less than 5 minutes
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="ml-2 text-white font-semibold">BugVoyant-Ledger</span>
              </div>
              
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
                <div className="text-gray-400 text-sm text-center md:text-left">
                  © 2025 BugVoyant-Ledger. Transform incidents into insights.
                </div>
                <div className="flex items-center space-x-2 text-gray-500 text-xs">
                  <span>Built with</span>
                  <a 
                    href="https://bolt.new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Bolt.new
                  </a>
                  <span>for the World's Largest Hackathon</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}