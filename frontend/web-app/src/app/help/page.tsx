'use client';

import { Mail, Phone, MessageSquare, FileText, Video, BookOpen, Search, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16 pb-16">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
            Help & Support
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Get the assistance you need to maximize your strategic foresight capabilities
          </p>
        </div>

        {/* Quick Contact */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Email Support</h3>
            <a href="mailto:support@aiforesight.ai" className="text-xs text-blue-500 hover:underline">
              support@aiforesight.ai
            </a>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Response within 24 hours</p>
          </GlassCard>

          <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Phone Support</h3>
            <a href="tel:+18005551234" className="text-xs text-green-500 hover:underline">
              +1 (800) 555-1234
            </a>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Mon-Fri, 9AM-6PM EST</p>
          </GlassCard>

          <GlassCard className="p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Live Chat</h3>
            <button className="text-xs text-purple-500 hover:underline">
              Start Chat
            </button>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Available 24/7</p>
          </GlassCard>
        </div>

        {/* Knowledge Base */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Knowledge Base</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard className="p-6 hover:border-blue-500/50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Getting Started Guide</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Learn the fundamentals of scenario planning and how to leverage AI for strategic foresight
                  </p>
                  <a href="#" className="text-xs text-blue-500 hover:underline flex items-center">
                    Read Guide <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:border-green-500/50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Video Tutorials</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Watch step-by-step walkthroughs of key features and best practices for enterprise users
                  </p>
                  <a href="#" className="text-xs text-green-500 hover:underline flex items-center">
                    Watch Videos <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:border-purple-500/50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">API Documentation</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Comprehensive API reference for developers integrating foresight capabilities
                  </p>
                  <a href="#" className="text-xs text-purple-500 hover:underline flex items-center">
                    View Docs <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 hover:border-orange-500/50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">FAQ & Troubleshooting</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Find answers to common questions and solutions to frequently encountered issues
                  </p>
                  <a href="#" className="text-xs text-orange-500 hover:underline flex items-center">
                    Browse FAQ <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Enterprise Support */}
        <GlassCard className="p-8 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Enterprise Support</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Dedicated support for Fortune 500 companies and strategic consulting firms. Get priority assistance,
              custom training, and dedicated account management.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
                Contact Sales
              </button>
              <button className="px-6 py-2.5 border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium rounded-lg hover:bg-[var(--surface)] transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Common Use Cases */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Common Use Cases</h2>
          <div className="space-y-4">
            <details className="glass-panel rounded-lg p-4 hover:border-blue-500/30 transition-colors cursor-pointer">
              <summary className="font-semibold text-sm text-[var(--text-primary)] cursor-pointer">
                How do I generate my first scenario?
              </summary>
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                Navigate to "Generate Scenarios" from the sidebar, enter your company details, industry, and strategic context.
                Our AI will analyze multiple futures and generate comprehensive 2x2 matrix scenarios with signposts and action plans.
              </p>
            </details>

            <details className="glass-panel rounded-lg p-4 hover:border-green-500/30 transition-colors cursor-pointer">
              <summary className="font-semibold text-sm text-[var(--text-primary)] cursor-pointer">
                How do I export scenarios for board presentations?
              </summary>
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                Open any scenario from your library, click "View Document", then use the export buttons to download in
                PDF, PowerPoint (PPTX), or Word (DOCX) format. All exports are professionally formatted for C-suite presentations.
              </p>
            </details>

            <details className="glass-panel rounded-lg p-4 hover:border-purple-500/30 transition-colors cursor-pointer">
              <summary className="font-semibold text-sm text-[var(--text-primary)] cursor-pointer">
                What is Boardroom (BR) Format transformation?
              </summary>
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                BR Format transforms academic scenario analysis into executive-ready insights using the BLUF (Bottom Line Up Front)
                framework, Kill/Double decision matrices, and Watchtower dashboard metrics - optimized for Fortune 500 boardrooms.
              </p>
            </details>

            <details className="glass-panel rounded-lg p-4 hover:border-orange-500/30 transition-colors cursor-pointer">
              <summary className="font-semibold text-sm text-[var(--text-primary)] cursor-pointer">
                How accurate are AI-generated scenarios?
              </summary>
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                Our scenarios are powered by advanced multi-agent AI systems with extended reasoning capabilities. The AI analyzes current trends,
                historical patterns, and strategic frameworks used by top consulting firms. However, scenarios represent possible
                futures - not predictions. Always validate with domain experts.
              </p>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
