import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, LogIn, User, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Username and password are required.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username.trim().toLowerCase(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center p-6">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#4f6ef7 1px, transparent 1px), linear-gradient(90deg, #4f6ef7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-slate-100 font-mono">ForensicSaathi</h1>
          <p className="text-sm text-slate-500 mt-1">Evidence Integrity Engine</p>
          <p className="text-xs text-indigo-400/60 mt-0.5 font-mono">SIH 2026 · PS-26231</p>
        </div>

        {/* Card */}
        <div className="panel-elevated p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-200">Operator Sign-In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access is logged and session-tracked. All actions are audited.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="field-label mb-2 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="field-label mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 border border-red-700/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full spinner" /> Authenticating…</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In to Field Session</>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-lg bg-indigo-900/10 border border-indigo-700/20">
            <p className="text-[11px] text-indigo-400/80 font-mono leading-relaxed">
              Demo: <strong className="text-indigo-300">fieldoperator</strong> / <strong className="text-indigo-300">ForensicSaathi@2026!</strong>
            </p>
          </div>

          {/* Sign up link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-600">
              New operator?{' '}
              <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-5 pt-4 border-t border-slate-700/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ForensicSaathi produces <strong className="text-amber-500/70">presumptive field results only</strong>.
                All results must be confirmed by an accredited laboratory before enforcement action.
                This system is a demonstration prototype for SIH 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {[
            'Password: bcryptjs hashed',
            'Session: JWT (8h TTL)',
            'DB: SQLite + WAL',
          ].map(label => (
            <span key={label} className="text-[10px] text-slate-700 font-mono">{label}</span>
          ))}
        </div>

        <p className="text-center text-xs text-slate-700 mt-3">
          Digital Companion for Field Drug Testing · Problem Statement 26231
        </p>
      </div>
    </div>
  );
}
