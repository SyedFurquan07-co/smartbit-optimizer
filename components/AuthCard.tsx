import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AuthCardProps {
  onLoginSuccess: () => void;
  auth?: any;
  db?: any;
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

const AuthCard: React.FC<AuthCardProps> = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = (login: boolean) => {
    setIsLoginMode(login);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      if (isLoginMode) {
        // Login Logic with Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        if (data.user) {
          onLoginSuccess();
        }
      } else {
        // Signup Logic with Supabase
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: trimmedName,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        const user = data.user;
        if (!user) {
          throw new Error("Sign up failed: no user returned.");
        }

        // Create user profile row in Supabase 'profiles' table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: trimmedName,
            email: user.email || normalizedEmail,
            total_proposals: 0,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error("Profile creation error:", profileError.message);
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }

        onLoginSuccess();
      }
    } catch (err: any) {
      console.error("Authentication error:", err.message);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#151823] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/80 p-8 sm:p-10 relative overflow-hidden">
        {/* Subtle top violet glow highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-80" />
        
        {/* Header and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] mb-4 shadow-lg shadow-[#8B5CF6]/25 ring-1 ring-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {isLoginMode ? 'Welcome Back' : 'Get Started with Smartbit'}
          </h2>
          <p className="text-sm text-[#A7ADBD] mt-1.5">
            {isLoginMode ? 'Sign in to access your business proposal workspace' : 'Create your account to start generating intelligent proposals'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-[#0B0D14] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => toggleMode(true)}
            className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              isLoginMode
                ? 'bg-[#1B1F2C] text-white shadow-sm border border-white/[0.08]'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => toggleMode(false)}
            className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              !isLoginMode
                ? 'bg-[#1B1F2C] text-white shadow-sm border border-white/[0.08]'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
            <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLoginMode && (
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
                placeholder="Jane Doe"
                aria-label="Your full name"
                aria-required="true"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
              placeholder="you@company.com"
              aria-label="Email address"
              aria-required="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
              placeholder="••••••••"
              aria-label="Password"
              aria-required="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!isLoginMode && (
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm-password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
                placeholder="••••••••"
                aria-label="Re-enter password"
                aria-required="true"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#8B5CF6]/25 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#151823] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              aria-label={isLoginMode ? 'Sign In' : 'Create Account'}
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              <span>{loading ? (isLoginMode ? 'Signing In...' : 'Creating Account...') : (isLoginMode ? 'Sign In' : 'Create Free Account')}</span>
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[#A7ADBD]">
          {isLoginMode ? "Don't have an account yet?" : "Already have an account?"}{' '}
          <button
            type="button"
            onClick={() => toggleMode(!isLoginMode)}
            className="text-[#A78BFA] hover:text-[#C4B5FD] font-semibold underline underline-offset-4 focus:outline-none ml-1 transition-colors"
          >
            {isLoginMode ? 'Create one now' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthCard;