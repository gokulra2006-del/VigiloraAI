import { Card } from "@/components/ui/card";
import { Play, Pause, Save, Plus, ArrowRight, Settings2, Trash2 } from "lucide-react";

export function PipelineBuilder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Inference Pipelines</h3>
          <p className="text-[13px] text-muted-foreground">Visually construct AI processing chains.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[13px] font-medium transition-colors shadow-sm">
            <Save size={14} /> Save Pipeline
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:bg-white/5 rounded-md text-[13px] text-white transition-colors shadow-sm">
            <Play size={14} /> Deploy
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[600px]">
        {/* Node Library */}
        <Card className="w-64 bg-zinc-900/40 border-white/5 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <h4 className="text-sm font-semibold text-white">Nodes Library</h4>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-2">Sources</div>
            <div className="p-2 border border-white/10 bg-zinc-900 rounded cursor-grab hover:border-white/20 text-[13px] font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> RTSP Stream
            </div>
            
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-4">Models</div>
            <div className="p-2 border border-white/10 bg-zinc-900 rounded cursor-grab hover:border-white/20 text-[13px] font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> YOLOv8 (Object)
            </div>
            <div className="p-2 border border-white/10 bg-zinc-900 rounded cursor-grab hover:border-white/20 text-[13px] font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> ALPR (Plates)
            </div>
            
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-4">Actions</div>
            <div className="p-2 border border-white/10 bg-zinc-900 rounded cursor-grab hover:border-white/20 text-[13px] font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Trigger Alert
            </div>
          </div>
        </Card>

        {/* Canvas */}
        <Card className="flex-1 bg-[#09090b] border-white/5 relative overflow-hidden flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          
          {/* Mock Pipeline Nodes */}
          <div className="absolute top-32 left-12 w-48 bg-zinc-900 border border-blue-500/50 rounded-lg shadow-xl">
            <div className="p-2 border-b border-white/5 flex items-center justify-between bg-blue-500/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[12px] font-semibold text-white">RTSP Source</span>
              </div>
              <Settings2 size={12} className="text-muted-foreground" />
            </div>
            <div className="p-3 text-[11px] text-muted-foreground">
              Main Gate Camera (CAM-01)
            </div>
            {/* Output Port */}
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-zinc-800 border-2 border-blue-500 rounded-full -translate-y-1/2"></div>
          </div>

          <ArrowRight className="absolute top-[164px] left-[240px] text-white/20" size={24} />

          <div className="absolute top-32 left-[300px] w-48 bg-zinc-900 border border-emerald-500/50 rounded-lg shadow-xl">
            {/* Input Port */}
            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-zinc-800 border-2 border-emerald-500 rounded-full -translate-y-1/2"></div>
            <div className="p-2 border-b border-white/5 flex items-center justify-between bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[12px] font-semibold text-white">ALPR Engine</span>
              </div>
              <Settings2 size={12} className="text-muted-foreground" />
            </div>
            <div className="p-3 text-[11px] text-muted-foreground">
              Confidence &gt; 80%
            </div>
            {/* Output Port */}
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-zinc-800 border-2 border-emerald-500 rounded-full -translate-y-1/2"></div>
          </div>

          <ArrowRight className="absolute top-[164px] left-[492px] text-white/20" size={24} />

          <div className="absolute top-32 left-[550px] w-48 bg-zinc-900 border border-amber-500/50 rounded-lg shadow-xl">
            {/* Input Port */}
            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-zinc-800 border-2 border-amber-500 rounded-full -translate-y-1/2"></div>
            <div className="p-2 border-b border-white/5 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-[12px] font-semibold text-white">SOC Alert</span>
              </div>
              <Settings2 size={12} className="text-muted-foreground" />
            </div>
            <div className="p-3 text-[11px] text-muted-foreground">
              Level: High Priority
            </div>
          </div>

        </Card>
      </div>
    </div>
  );
}
