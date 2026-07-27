import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { BrainCircuit, ShieldAlert, Loader2 } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to SentinelVision</h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
              placeholder="e.g. admin"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300">Password</label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Forgot password?</a>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg px-4 py-3 mt-6 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500 font-medium">
            Demo Credentials: admin / password123
          </p>
        </div>
      </div>
    </div>
  );
}
