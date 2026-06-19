import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Key, User, ArrowRight, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const { login, organization, copMode, selectOrganization } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isCop = organization === 'COP';
  const accentBg = isCop ? 'bg-indigo-600' : 'bg-bwz-primary';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (!res.success) setError(res.msg);
    } catch (err) {
      setError('Network or system error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl card shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-2 animate-fade-in">
        {/* Brand panel */}
        <div className={`p-10 md:p-12 text-white flex flex-col justify-between relative overflow-hidden ${isCop ? 'bg-indigo-600' : 'bg-bwz-primary'}`}>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {organization === 'BWZ' ? 'Bawaqar Zindagi' : 'COP Initiative'}
            </h1>
            <p className="mt-3 text-white/80 leading-relaxed">
              {organization === 'BWZ'
                ? 'Psychiatric Rehabilitation & Hospital Management System'
                : copMode === 'FIELD' ? 'Field Operations Portal' : 'Medical Camp Management System'}
            </p>
            {organization === 'BWZ' && <p className="mt-4 font-spectral text-xl text-white/90">روشن ذہن روشن مستقبل</p>}
          </div>
          <div className="relative text-xs text-white/60 mt-10 space-y-0.5">
            <p>Org: {organization}{copMode ? ` · ${copMode}` : ''}</p>
            <button onClick={() => selectOrganization(null as any)} className="mt-3 text-white/90 underline underline-offset-2 hover:text-white">
              ← Change organization
            </button>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Staff Login</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your assigned credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username / ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="input pl-10"
                  placeholder="e.g. admin or utalib.exe1234"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm font-medium flex items-center animate-fade-in">
                <Lock size={16} className="mr-2 shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={`btn w-full text-white py-3 ${accentBg} hover:opacity-90`}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating…</> : <>Secure Login <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Trouble logging in? Ask your administrator to verify your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
