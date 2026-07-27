import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
          <AlertCircle size={40} className="text-red-400" />
        </div>
        
        <h1 className="text-6xl font-bold text-white tracking-tighter mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-zinc-200 mb-2">Page not found</h2>
        <p className="text-zinc-400 max-w-md mb-8">
          The page you are looking for doesn't exist or has been moved. Verify the URL or return to the dashboard.
        </p>
        
        <Link 
          to="/dashboard"
          className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg px-6 py-3 transition-colors shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
