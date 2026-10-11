import React, { useState } from 'react';

interface AppShellProps {
  user: any;
  currentPage: 'dashboard' | 'proposal' | 'history' | 'upload';
  setCurrentPage: (page: 'dashboard' | 'proposal' | 'history' | 'upload') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({
  user,
  currentPage,
  setCurrentPage,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      description: 'Overview & metrics',
    },
    {
      id: 'proposal' as const,
      label: 'Generate Proposal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: 'AI-assisted generation',
    },
    {
      id: 'history' as const,
      label: 'Proposal History',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Saved & analyzed',
    },
    {
      id: 'upload' as const,
      label: 'PDF Intelligence',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'AI document analysis',
    },
  ];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const handleNavClick = (pageId: 'dashboard' | 'proposal' | 'history' | 'upload') => {
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Executive Dashboard';
      case 'proposal':
        return 'Proposal Generator';
      case 'history':
        return 'Proposal Archive & History';
      case 'upload':
        return 'PDF Intelligence Workspace';
      default:
        return 'Smartbit Optimizer';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D14] text-[#F8FAFC] flex flex-col md:flex-row antialiased selection:bg-[#8B5CF6]/30 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#10131C] border-r border-white/[0.07] shrink-0 min-h-screen sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/25 ring-1 ring-white/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Smartbit</span>
                <span className="text-[#A78BFA] font-semibold text-xs px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30">AI</span>
              </div>
              <div className="text-[11px] font-medium tracking-wider uppercase text-[#A7ADBD]">Optimizer SaaS</div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Workspace Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left group relative ${
                  isActive
                    ? 'bg-[#8B5CF6]/15 text-white border border-[#8B5CF6]/30 shadow-sm shadow-[#8B5CF6]/10'
                    : 'text-[#A7ADBD] hover:text-white hover:bg-[#151823] border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#8B5CF6] rounded-r-full" />
                )}
                <span className={`transition-colors ${isActive ? 'text-[#A78BFA]' : 'text-[#64748B] group-hover:text-[#A78BFA]'}`}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.label}</div>
                  <div className="text-[11px] text-[#64748B] truncate group-hover:text-[#A7ADBD]/80">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Security & Sync Status Pill */}
        <div className="p-4 mx-4 mb-3 rounded-xl bg-[#151823] border border-white/[0.06] flex items-center space-x-3">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="text-[11px] leading-tight text-[#A7ADBD]">
            <span className="text-white font-medium block">Supabase Connected</span>
            <span>Row-Level Security Active</span>
          </div>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-white/[0.07] bg-[#0E1119]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1B1F2C] to-[#252A3C] border border-white/10 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-inner">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="text-[11px] text-[#64748B] truncate">{user?.email || 'Authenticated'}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-lg text-[#A7ADBD] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 bg-[#10131C]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#A7ADBD] hover:text-white hover:bg-[#151823] border border-white/[0.06] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>

            {/* Mobile Brand (visible only on small screens) */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#8B5CF6] flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-sm tracking-tight text-white">Smartbit</span>
            </div>

            {/* Breadcrumb Title */}
            <div className="hidden sm:flex items-center space-x-2 text-xs text-[#64748B]">
              <span className="hover:text-[#A7ADBD] cursor-pointer" onClick={() => handleNavClick('dashboard')}>Workspace</span>
              <span>/</span>
              <span className="text-white font-semibold">{getPageTitle()}</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-3">
            {currentPage !== 'proposal' && (
              <button
                onClick={() => handleNavClick('proposal')}
                className="hidden sm:inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-sm shadow-[#8B5CF6]/30 transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Proposal</span>
              </button>
            )}

            <div className="hidden md:flex items-center pl-3 border-l border-white/[0.08] space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#1B1F2C] border border-white/10 flex items-center justify-center text-white font-medium text-xs">
                {initial}
              </div>
              <span className="text-xs text-[#A7ADBD] font-medium hidden lg:inline max-w-[120px] truncate">
                {displayName}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-72 max-w-[85%] h-full bg-[#10131C] border-r border-white/[0.08] p-5 flex flex-col space-y-4 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center text-white shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-bold text-white text-base">Smartbit Optimizer</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#A7ADBD] hover:text-white"
                  aria-label="Close Navigation Menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                      currentPage === item.id
                        ? 'bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/30'
                        : 'text-[#A7ADBD] hover:text-white hover:bg-[#151823]'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1B1F2C] border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                    <div className="text-[10px] text-[#64748B] truncate">{user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Screen View Container */}
        <main className="flex-1 bg-gradient-to-b from-[#10131C]/40 via-[#0B0D14] to-[#0B0D14] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
