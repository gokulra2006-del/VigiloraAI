import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, MoreHorizontal, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function UsersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const users = [
    { name: 'Gokul', email: 'gokul@sentinel.ai', role: 'Super Admin', status: 'Active' },
    { name: 'Alex M.', email: 'alex@sentinel.ai', role: 'SOC Analyst', status: 'Active' },
    { name: 'Sarah K.', email: 'sarah@sentinel.ai', role: 'SOC Analyst', status: 'Offline' },
    { name: 'David R.', email: 'david@sentinel.ai', role: 'Viewer', status: 'Suspended' },
    { name: 'Elena G.', email: 'elena@sentinel.ai', role: 'Field Agent', status: 'Active' },
  ];

  const roles = [
    { name: 'Super Admin', count: 1, color: 'bg-red-500' },
    { name: 'SOC Analyst', count: 2, color: 'bg-emerald-500' },
    { name: 'Field Agent', count: 1, color: 'bg-blue-500' },
    { name: 'Viewer', count: 1, color: 'bg-zinc-500' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Access Control</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Manage users, roles, and permissions.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 h-8 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors shadow-sm"
        >
          <UserPlus size={14} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map(role => (
          <Card key={role.name} className="bg-zinc-900/40 border-white/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${role.color}`} />
                <span className="text-[13px] font-medium text-white">{role.name}</span>
              </div>
              <span className="text-2xl font-semibold text-white">{role.count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">User</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(user => (
                <tr key={user.email} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-medium text-[11px]">
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[13px] text-white">{user.name}</div>
                        <div className="text-[12px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Shield size={12} className={
                        user.role === 'Super Admin' ? 'text-red-500' :
                        user.role === 'SOC Analyst' ? 'text-emerald-500' :
                        user.role === 'Field Agent' ? 'text-blue-500' : 'text-zinc-500'
                      }/>
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] font-bold tracking-widest uppercase border-transparent px-2 py-0.5 ${
                      user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                      user.status === 'Suspended' ? 'bg-red-500/10 text-red-500' : 
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-white transition-colors p-1 rounded hover:bg-white/5"><MoreHorizontal size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pt-[10vh]">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-6"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white"
              >
                <X size={16} />
              </button>
              <h2 className="text-lg font-semibold text-white mb-1">Add New User</h2>
              <p className="text-xs text-muted-foreground mb-6">Invite a new member to the Sentinel platform.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address</label>
                  <input type="email" placeholder="name@company.com" className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none">
                    <option>SOC Analyst</option>
                    <option>Super Admin</option>
                    <option>Field Agent</option>
                    <option>Viewer</option>
                  </select>
                </div>
                <button className="w-full mt-4 bg-white text-black font-medium text-sm py-2 rounded-md hover:bg-zinc-200 transition-colors">
                  Send Invitation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
