import { useEffect, useState } from 'react';
import { fetchThreats } from '@/services/api/threat-intel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldBan, Globe, ServerCrash } from 'lucide-react';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } }
};

export function ThreatIntelPage() {
  const [threats, setThreats] = useState<any[]>([]);

  useEffect(() => {
    fetchThreats().then(setThreats);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Threat Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Global threat indicators and active countermeasures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial="hidden" animate="show" variants={itemVariants}>
          <Card className="h-full bg-zinc-900/40 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">Active Threats</CardTitle>
              <ShieldBan className="text-red-500/50" size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tighter text-white">12</div>
              <p className="text-[12px] text-muted-foreground mt-1">+2 from yesterday</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial="hidden" animate="show" variants={itemVariants} transition={{ delay: 0.1 }}>
          <Card className="h-full bg-zinc-900/40 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">Blocked IPs</CardTitle>
              <Globe className="text-amber-500/50" size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tighter text-white">842</div>
              <p className="text-[12px] text-muted-foreground mt-1">Across 14 regions</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={itemVariants} transition={{ delay: 0.2 }}>
          <Card className="h-full bg-zinc-900/40 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-white/20" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">CVEs Tracked</CardTitle>
              <ServerCrash className="text-white/30" size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tighter text-white">14.2k</div>
              <p className="text-[12px] text-muted-foreground mt-1">Database updated 1h ago</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Recent Threat Indicators</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="divide-y divide-white/5">
            {threats.length === 0 ? (
               <div className="py-8 text-center text-muted-foreground text-[13px]">Loading threats...</div>
            ) : threats.map((threat, i) => (
              <motion.div 
                key={threat.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 + (i * 0.05) }} 
                className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-4 sm:px-0 gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-md ${threat.cvss && threat.cvss > 9 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    <ShieldBan size={16} className={threat.cvss && threat.cvss > 9 ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[14px] text-white">{threat.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-muted-foreground font-mono">{threat.id}</span>
                      {threat.cvss && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="text-[12px] font-medium text-muted-foreground">CVSS {threat.cvss}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Badge 
                    variant="outline" 
                    className={`text-[11px] uppercase px-2 py-0.5 border-transparent ${
                      threat.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                      threat.status === 'patching' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {threat.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
