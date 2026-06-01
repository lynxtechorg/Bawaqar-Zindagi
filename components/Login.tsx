
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Key, User, ArrowRight, Lock } from 'lucide-react';

const Login = () => {
  const { login, organization, copMode, selectOrganization } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      
      try {
        const res = await login(username, password);
        if (!res.success) {
            setError(res.msg);
        }
      } catch (err) {
        setError("Network or System Error");
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 grid grid-cols-1 md:grid-cols-2">
        
        {/* Branding Side */}
        <div className={`p-12 text-white flex flex-col justify-between ${organization === 'COP' ? 'bg-indigo-900' : 'bg-bwz-primary'}`}>
          <div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
               <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {organization === 'BWZ' ? 'Bawaqar Zindagi' : 'COP Initiative'}
            </h1>
            <p className="mt-4 text-white/80 text-lg">
              {organization === 'BWZ' 
                ? 'Psychiatric Rehabilitation & Hospital Management System' 
                : copMode === 'FIELD' ? 'Field Operations Portal' : 'Medical Camp Management System'}
            </p>
          </div>
          <div className="text-sm opacity-60">
             Org: {organization} <br/>
             {copMode && `Mode: ${copMode}`} <br/>
             Secure Portal Access
          </div>
          <button onClick={() => selectOrganization(null as any)} className="mt-8 text-white underline text-left hover:text-white/80">
             ← Change Organization
          </button>
        </div>
        
        {/* Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
             <h2 className="text-2xl font-bold text-slate-800">Staff Login</h2>
             <p className="text-slate-500 text-sm">Please enter your assigned credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username / ID</label>
                  <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-current transition-colors bg-white text-slate-900"
                        placeholder="e.g. admin or UTALIB-EXEC"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                      />
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                  <div className="relative">
                      <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-current transition-colors bg-white text-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                  </div>
              </div>

              {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center">
                      <Lock size={16} className="mr-2"/> {error}
                  </div>
              )}
              
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-xl ${organization === 'COP' ? 'bg-indigo-900 hover:bg-indigo-800' : 'bg-bwz-primary hover:bg-teal-700'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                  {loading ? 'Authenticating...' : 'Secure Login'} 
                  {!loading && <ArrowRight className="ml-2" size={18} />}
              </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
             If you cannot login, ask the administrator to run the Database Reset SQL script.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
