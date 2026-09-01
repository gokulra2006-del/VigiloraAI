import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  FileText, Download, Calendar, Search, Filter, Plus, Printer,
  FileSpreadsheet, Clock, X, CheckCircle2, Shield, Eye, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface CaseItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  zone_id?: string;
  created_at?: string;
  summary?: string;
}

export function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [reportTitle, setReportTitle] = useState('');

  const loadCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/cases/');
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (e) {
      console.error('Failed to fetch cases for reports', e);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleDownloadPdf = (caseId: string) => {
    window.open(`http://127.0.0.1:8000/api/v1/cases/${caseId}/report/pdf`, '_blank');
  };

  const handleViewHtml = (caseId: string) => {
    window.open(`http://127.0.0.1:8000/api/v1/cases/${caseId}/report/html`, '_blank');
  };

  const filteredCases = cases.filter(c =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.severity || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest">
              Forensic Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="text-cyan-400" size={22} />
            Incident Reports & Case Dossiers
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Generate, inspect, and download official binary PDF investigation dossiers and forensic audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCases}
            className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white transition-colors"
            title="Refresh Cases"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-2 px-3.5 h-9 bg-zinc-900 border border-white/10 rounded-lg text-[12px] font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <Clock size={14} /> Schedule Report
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cases by title, ID, or severity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-zinc-900/50 border border-white/10 rounded-lg pl-9 pr-3 text-[13px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Cases & Reports Table */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/60">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Consolidated Case Investigation Dossiers
          </span>
          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
            {cases.length} Ready for Export
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-900/50">
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Case ID</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Title / Summary</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Severity</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingCases ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="h-12 bg-zinc-900/20" />
                  </tr>
                ))
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    No investigation cases found. Run the attack simulator to generate case records.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const sevColor =
                    c.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                    c.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                    'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zinc-300 font-semibold">
                          #{c.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="text-[13px] font-medium text-white truncate">{c.title || 'Security Incident Case'}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{c.summary || 'Consolidated physical and cyber incident cluster.'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${sevColor}`}>
                          {c.severity || 'medium'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-300 capitalize">
                          {(c.status || 'open').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadPdf(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-semibold transition-all shadow-sm"
                            title="Download Native PDF Dossier"
                          >
                            <Download size={13} />
                            Download PDF
                          </button>
                          <button
                            onClick={() => handleViewHtml(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded-lg text-xs font-medium transition-all"
                            title="View Styled HTML Report"
                          >
                            <Eye size={13} />
                            View HTML
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-cyan-400" />
                  Schedule Automated Dossiers
                </h3>
                <button onClick={() => setIsScheduleModalOpen(false)} className="text-muted-foreground hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>Configure automated cron schedules to generate daily or weekly SOC summary PDF dossiers.</p>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 font-mono text-[11px] text-zinc-300">
                  <div>• Frequency: Daily at 00:00 UTC</div>
                  <div>• Format: Native PDF-1.4 Dossier</div>
                  <div>• Distribution: Email + Slack Dispatch</div>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}