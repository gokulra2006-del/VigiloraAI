import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Download, Calendar, Search, Filter, Plus, Printer, FileSpreadsheet, Clock, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [reports, setReports] = useState([
    { id: 1, title: 'Weekly SOC Summary', type: 'Security', date: 'Oct 19, 2026', size: '2.4 MB', format: 'PDF' },
    { id: 2, title: 'AI Detection Accuracy', type: 'Analytics', date: 'Sep 30, 2026', size: '1.1 MB', format: 'Excel' },
    { id: 3, title: 'Compliance Audit Trail', type: 'Audit', date: 'Jul 15, 2026', size: '14.5 MB', format: 'PDF' },
    { id: 4, title: 'Traffic Volume Analysis', type: 'Analytics', date: 'Oct 01, 2026', size: '3.8 MB', format: 'CSV' },
  ]);
  
  const [reportTitle, setReportTitle] = useState('');
  
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setReports([{ id: Date.now(), title: reportTitle || 'Custom Report', type: 'Custom', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), size: '0.5 MB', format: 'PDF' }, ...reports]);
    setIsGenerateModalOpen(false);
    setReportTitle('');
  };

  const handleExport = (format: string, title: string) => {
    alert(`Exporting ${title} as ${format}...`);
  };

  const filteredReports = reports.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports & Audits</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Generate, schedule, and export security intelligence reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-2 px-3 h-9 bg-zinc-900 border border-white/10 rounded-md text-[13px] text-white hover:bg-white/5 transition-colors"
          >
            <Clock size={14} /> Schedule
          </button>
          <button 
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-3 h-9 bg-blue-600 hover:bg-blue-500 rounded-md text-[13px] font-medium text-white shadow-sm transition-colors"
          >
            <Plus size={14} /> Generate Report
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search reports by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-zinc-900/50 border border-white/10 rounded-md pl-9 pr-3 text-[13px] text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-3 h-9 bg-zinc-900/50 border border-white/10 rounded-md text-[13px] text-white hover:bg-white/5 transition-colors shrink-0">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-900/50">
                <th className="px-4 py-3 text-[12px] font-medium text-muted-foreground">Report Name</th>
                <th className="px-4 py-3 text-[12px] font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-[12px] font-medium text-muted-foreground">Generated Date</th>
                <th className="px-4 py-3 text-[12px] font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 text-[12px] font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" />
                      <span className="text-[13px] font-medium text-white">{report.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[11px] text-zinc-300 border border-white/10">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Calendar size={12} /> {report.date}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-muted-foreground">{report.size}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleExport('PDF', report.title)} className="p-1.5 hover:bg-white/10 rounded text-muted-foreground hover:text-white" title="Download PDF">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleExport('Excel', report.title)} className="p-1.5 hover:bg-white/10 rounded text-muted-foreground hover:text-green-400" title="Export Excel">
                        <FileSpreadsheet size={14} />
                      </button>
                      <button onClick={() => handleExport('Print', report.title)} className="p-1.5 hover:bg-white/10 rounded text-muted-foreground hover:text-white" title="Print Report">
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No reports match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-white">Generate Report</h3>
                <button onClick={() => setIsGenerateModalOpen(false)} className="text-muted-foreground hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleGenerate} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-zinc-300">Report Title</label>
                  <input 
                    type="text" 
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Q3 Compliance Audit" 
                    className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-zinc-300">Data Source</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option>All Security Events</option>
                    <option>Traffic Analytics Only</option>
                    <option>System Health</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors">
                  Generate Now
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-white">Schedule Report</h3>
                <button onClick={() => setIsScheduleModalOpen(false)} className="text-muted-foreground hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setIsScheduleModalOpen(false); alert('Report scheduled successfully!'); }} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-zinc-300">Frequency</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option>Daily at 08:00 AM</option>
                    <option>Weekly on Monday</option>
                    <option>Monthly on 1st</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-zinc-300">Delivery Recipients (Emails)</label>
                  <input type="text" placeholder="admin@sentinel.com" className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full py-2 bg-white text-black hover:bg-zinc-200 rounded-md text-sm font-medium transition-colors">
                  Save Schedule
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
