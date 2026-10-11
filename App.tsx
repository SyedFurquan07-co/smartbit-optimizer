import React, { useState, useCallback, useEffect, useMemo } from 'react';
import FeatureRoadmap from './components/FeatureRoadmap';
import AuthCard from './components/AuthCard';
import Dashboard from './components/Dashboard';
import ProposalGenerator from './components/ProposalGenerator';
import ProposalHistory from './components/ProposalHistory';
import ProposalUpload from './components/ProposalUpload';
import PdfWorkspace from './components/PdfWorkspace';
import AppShell from './components/AppShell';
import { RoadmapFeature } from './types';
import { supabase } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'proposal' | 'history' | 'upload'>('dashboard');

  // Adapt Supabase user to preserve compatibility with existing components expecting user properties
  const adaptedUser = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.id,
      id: user.id,
      email: user.email ?? null,
      displayName: (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || null,
      ...user,
    };
  }, [user]);

  const authAdapter = useMemo(() => {
    return {
      currentUser: adaptedUser as any,
    };
  }, [adaptedUser]);

  useEffect(() => {
    let mounted = true;

    // Retrieve existing session on initial load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error("Error retrieving Supabase session:", error.message);
      }
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
      setLoadingAuth(false);
      if (!currentUser) {
        setCurrentPage('dashboard');
      }
    }).catch((err) => {
      if (!mounted) return;
      console.error("Unexpected error retrieving Supabase session:", err);
      setLoadingAuth(false);
    });

    // Listen to Supabase authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
      setLoadingAuth(false);
      if (!currentUser) {
        setCurrentPage('dashboard');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsLoggedIn(true);
    setShowAuthForm(false);
    setCurrentPage('dashboard');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsLoggedIn(false);
      setShowAuthForm(false);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to log out. Please try again.");
    }
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  const roadmapFeatures: RoadmapFeature[] = [
    {
      id: '1',
      title: 'Create Proposal',
      description: 'Input your project details and requirements to synthesize structured proposals.',
      isActive: true,
    },
    {
      id: '2',
      title: 'Score & Analyze',
      description: 'Receive an instant quality score and comprehensive breakdown across key dimensions.',
      isActive: false,
    },
    {
      id: '3',
      title: 'Auto Improve',
      description: 'Receive automated revisions that address weaknesses if the proposal scores below 75%.',
      isActive: false,
    },
    {
      id: '4',
      title: 'Save to Cloud Vault',
      description: 'Automatically archive generated and uploaded proposals under Supabase Row-Level Security.',
      isActive: false,
    },
    {
      id: '5',
      title: 'Export PDF',
      description: 'Download original and improved proposals as clean client-ready PDF documents.',
      isActive: false,
    },
    {
      id: '6',
      title: 'Deep Analytics',
      description: 'Access entity extractions (NER), competitor detections, and weakness assessments.',
      isActive: false,
    },
    {
      id: '7',
      title: 'Predict Success Rate',
      description: 'Estimate acceptance probability before submission using AI predictive indexing.',
      isActive: false,
    },
  ];

  // Loading state
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0D14] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#A7ADBD]">Initializing Smartbit Optimizer...</p>
      </div>
    );
  }

  // Authenticated State wrapped in AppShell
  if (isLoggedIn) {
    return (
      <AppShell
        user={adaptedUser}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
      >
        {currentPage === 'dashboard' && (
          <Dashboard
            onLogout={handleLogout}
            auth={authAdapter as any}
            user={adaptedUser}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === 'proposal' && (
          <ProposalGenerator
            onBack={handleBackToDashboard}
            auth={authAdapter as any}
          />
        )}
        {currentPage === 'history' && (
          <ProposalHistory
            onBack={handleBackToDashboard}
            auth={authAdapter as any}
          />
        )}
        {currentPage === 'upload' && (
          <PdfWorkspace
            onBack={handleBackToDashboard}
          />
        )}
      </AppShell>
    );
  }

  // Unauthenticated Landing Page Experience
  return (
    <div className="min-h-screen bg-[#0B0D14] text-[#F8FAFC] flex flex-col selection:bg-[#8B5CF6]/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-20 bg-[#10131C]/80 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowAuthForm(false)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30 ring-1 ring-white/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>Smartbit</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 font-semibold">AI SaaS</span>
            </div>
            <div className="text-[11px] text-[#A7ADBD] tracking-wider uppercase">Optimizer Suite</div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {!showAuthForm ? (
            <button
              id="sign-in-nav-btn"
              onClick={() => setShowAuthForm(true)}
              className="py-2.5 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#8B5CF6]/25 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#10131C] transition-all duration-200"
            >
              Sign In / Register
            </button>
          ) : (
            <button
              id="back-home-btn"
              onClick={() => setShowAuthForm(false)}
              className="py-2.5 px-5 bg-[#1B1F2C] hover:bg-[#252A3C] text-[#A7ADBD] hover:text-white border border-white/[0.08] text-xs sm:text-sm font-semibold rounded-xl transition-all"
            >
              Back to Home
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#8B5CF6]/10 blur-[120px] rounded-full pointer-events-none" />

        {showAuthForm ? (
          <div className="w-full max-w-md my-auto animate-fade-in z-10">
            <AuthCard onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : (
          <div className="max-w-5xl w-full flex flex-col items-center text-center space-y-12 z-10">
            {/* Hero Section */}
            <div className="space-y-6 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151823] border border-white/[0.08] shadow-inner text-xs font-semibold text-[#A78BFA]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Next-Gen Enterprise Proposal Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold text-[#F8FAFC] tracking-tight leading-[1.15]">
                Generate & Perfect High-Impact Proposals with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] via-[#C4B5FD] to-[#8B5CF6]">
                  AI Precision
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#A7ADBD] leading-relaxed max-w-2xl mx-auto">
                Streamline corporate proposal workflows. Synthesize client-ready documents, detect weaknesses, extract competitive intelligence, and predict acceptance probability in seconds.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  id="launch-workspace-hero-btn"
                  onClick={() => setShowAuthForm(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-xl shadow-[#8B5CF6]/30 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0D14] transition-all flex items-center justify-center space-x-2"
                >
                  <span>Launch Workspace</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <a
                  id="explore-capabilities-btn"
                  href="#roadmap"
                  className="w-full sm:w-auto px-6 py-4 bg-[#151823] hover:bg-[#1B1F2C] text-[#A7ADBD] hover:text-white border border-white/[0.08] font-semibold text-sm rounded-xl transition-all"
                >
                  Explore Capabilities
                </a>
              </div>
            </div>

            {/* Feature Statistics Ribbon */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/[0.06]">
              <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] text-left">
                <div className="text-2xl font-bold text-white mb-1">75%+</div>
                <div className="text-xs text-[#A7ADBD]">Automated optimization benchmark with instant revisions</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] text-left">
                <div className="text-2xl font-bold text-white mb-1">900 KB</div>
                <div className="text-xs text-[#A7ADBD]">Chunking architecture for handling long document manuscripts</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] text-left">
                <div className="text-2xl font-bold text-white mb-1">RLS Vault</div>
                <div className="text-xs text-[#A7ADBD]">Supabase user isolation with verified cryptographic sessions</div>
              </div>
            </div>

            {/* Feature Roadmap Section */}
            <section id="roadmap" className="w-full pt-8">
              <FeatureRoadmap features={roadmapFeatures} />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/[0.07] bg-[#0E1119] text-center text-xs text-[#64748B]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Smartbit Optimizer. All rights reserved.</div>
          <div className="flex items-center space-x-4 text-[#A7ADBD]">
            <span>Supabase Cloud Integration</span>
            <span>•</span>
            <span>Edge Function V1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
