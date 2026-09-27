import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, UserPlus, User, Lock, Mail, Hash, Eye, EyeOff, AlertTriangle, Check, X } from 'lucide-react';
import { authApi } from '../lib/api';

interface PasswordStrength {
  score: number; // 0–4
  label: string;
  color: string;
  checks: { label: string; pass: boolean }[];
}

function evaluatePassword(pw: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'Uppercase letter (A–Z)', pass: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter (a–z)', pass: /[a-z]/.test(pw) },
    { label: 'Number or symbol', pass: /[0-9!@#$%^&*()_+=\-[\]{};':",.<>?/\\|`~]/.test(pw) },
  ];
  const score = checks.filter(c => c.pass).length;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400'];
  return { score, label: labels[score], color: colors[score], checks };
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState({
    full_name: '', username: '', email: '', operator_id: '', password: '', confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pwStrength = useMemo(() => evaluatePassword(fields.password), [fields.password]);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields(prev => ({ ...prev, [key]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fields.full_name.trim() || !fields.username.trim() || !fields.email.trim() || !fields.password) {
      setError('All fields are required.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(fields.username)) {
      setError('Username may only contain letters, numbers, dots, underscores and hyphens.');
      return;
    }
    if (pwStrength.score < 3) {
      setError('Password is too weak. Please meet all the strength requirements.');
      return;
    }
    if (fields.password !== fields.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        full_name: fields.full_name.trim(),
        username: fields.username.trim().toLowerCase(),
        email: fields.email.trim().toLowerCase(),
        operator_id: fields.operator_id.trim() || `OP-${Math.floor(100 + Math.random() * 900)}`,
        password: fields.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({
    label, icon, name, type = 'text', placeholder, value, onChange, hint,
  }: {
    label: string; icon: React.ReactNode; name: string;
    type?: string; placeholder: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    hint?: string;
  }) => (
    <div>
      <label className="field-label mb-2 block">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4">{icon}</div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={name}
          spellCheck={false}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/30">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Account Created</h2>
          <p className="text-sm text-slate-400">Redirecting to sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center p-6">
      <div className="fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#4f6ef7 1px, transparent 1px), linear-gradient(90deg, #4f6ef7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-slate-100 font-mono">FIELDPROOF</h1>
          <p className="text-sm text-slate-500 mt-1">Create Field Operator Account</p>
        </div>

        <div className="panel-elevated p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-200">Register</h2>
            <p className="text-xs text-slate-500 mt-1">All account creations are logged and subject to supervisor review.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Field label="Full Name" icon={<User />} name="name" placeholder="e.g. Rajan Kumar"
              value={fields.full_name} onChange={set('full_name')} />

            <Field label="Username" icon={<User />} name="username" placeholder="e.g. rajan_k"
              value={fields.username} onChange={set('username')}
              hint="Letters, numbers, dots, underscores and hyphens only." />

            <Field label="Email Address" icon={<Mail />} name="email" type="email" placeholder="name@example.com"
              value={fields.email} onChange={set('email')} />

            <Field label="Operator ID (optional)" icon={<Hash />} name="operator_id" placeholder="e.g. OP-201 (auto-assigned if blank)"
              value={fields.operator_id} onChange={set('operator_id')} />

            {/* Password with strength indicator */}
            <div>
              <label className="field-label mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={fields.password}
                  onChange={set('password')}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {fields.password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pwStrength.score ? pwStrength.color : 'bg-slate-700/60'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">{pwStrength.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {pwStrength.checks.map(c => (
                      <div key={c.label} className={`flex items-center gap-1 text-[10px] ${c.pass ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {c.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="field-label mb-2 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  value={fields.confirm}
                  onChange={set('confirm')}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              {fields.confirm.length > 0 && fields.password !== fields.confirm && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 border border-red-700/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full spinner" /> Creating Account…</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Field Operator Account</>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-[10px] text-slate-700 font-mono">Passwords are hashed with bcryptjs (12 rounds) · Never stored in plaintext</p>
        </div>
      </div>
    </div>
  );
}
