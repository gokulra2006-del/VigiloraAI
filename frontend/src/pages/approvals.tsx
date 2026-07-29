import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { approveAction, fetchPendingApprovals, PlaybookApproval, rejectAction } from '@/services/api/approvals';
import { Card } from '@/components/ui/card';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PlaybookApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setApprovals(await fetchPendingApprovals()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (approval: PlaybookApproval, approved: boolean) => {
    setWorking(approval.id);
    try {
      if (approved) await approveAction(approval.id); else await rejectAction(approval.id);
      await load();
    } finally { setWorking(null); }
  };

  return <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-end justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight flex gap-2 items-center"><ShieldAlert className="text-amber-400" size={22}/> Approval Queue</h1>
        <p className="text-muted-foreground mt-1 text-[13px]">Human-in-the-loop decisions awaiting an operator.</p></div>
      <button onClick={load} className="p-2 rounded-md bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white"><RefreshCw size={15}/></button>
    </div>
    <div className="grid gap-3">
      {loading ? [1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-zinc-900/40 animate-pulse" />) : approvals.length === 0 ?
        <Card className="p-12 text-center bg-zinc-900/40 border-white/5"><Check className="mx-auto text-emerald-400 mb-3"/><p className="text-white font-medium">Approval queue is clear</p><p className="text-sm text-muted-foreground mt-1">New high-risk actions will appear here.</p></Card> :
        approvals.map(a => <Card key={a.id} className="p-5 bg-zinc-900/40 border-white/5">
          <div className="flex flex-col md:flex-row gap-5 md:items-start">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center"><Clock3 size={17}/></div>
            <div className="flex-1 min-w-0"><div className="flex gap-2 flex-wrap items-center"><h2 className="font-medium text-white">{a.playbook_name || 'Response playbook'}</h2><span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">{a.tier.replace(/_/g, ' ')}</span></div>
              <p className="text-[13px] text-zinc-300 mt-3 leading-relaxed">{a.justification_text || 'AI requires an operator decision before proceeding.'}</p>
              <div className="mt-3 text-[11px] text-muted-foreground">Requested {a.created_at ? new Date(a.created_at).toLocaleString() : 'now'} · Actions: {Array.isArray(a.actions) ? a.actions.map((x: any) => x.action).join(', ') : '—'}</div>
            </div>
            <div className="flex md:flex-col gap-2 shrink-0"><button disabled={working === a.id} onClick={() => decide(a, true)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-black text-[12px] font-semibold disabled:opacity-50"><Check size={14}/> Approve</button><button disabled={working === a.id} onClick={() => decide(a, false)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-[12px] font-semibold hover:bg-red-500/10 disabled:opacity-50"><X size={14}/> Reject</button></div>
          </div>
        </Card>) }
    </div>
  </div>;
}
