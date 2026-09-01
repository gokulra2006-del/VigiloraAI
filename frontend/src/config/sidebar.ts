import React from 'react';
import {
  LayoutDashboard, Settings, ShieldAlert,
  Activity, CarFront, Siren, ShieldBan, Map as MapIcon,
  FileText, Users, Crosshair, UserCheck, Briefcase, Film,
  Zap, BrainCircuit, CheckSquare, Video, Bot, Eye, Workflow, Mic
} from 'lucide-react';

export interface SidebarItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
}

export interface SidebarSectionConfig {
  title: string;
  items: SidebarItemConfig[];
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',      path: '/dashboard', icon: LayoutDashboard },
      { label: 'Live Feed',      path: '/feed',       icon: Activity },
      { label: 'GIS Map',        path: '/map',        icon: MapIcon },
      { label: 'Command Center', path: '/command-center', icon: Mic, badge: 'GOD MODE' },
      { label: 'OG AI',          path: '/nova',       icon: Bot,         badge: 'AI' },
    ]
  },
  {
    title: 'Detection',
    items: [
      { label: 'Vision AI',      path: '/vision-ai',     icon: Eye,         badge: 'AI' },
      { label: 'Object Alerts',  path: '/object-alerts', icon: Crosshair,   badge: 'LIVE' },
      { label: 'Cameras',        path: '/cameras',       icon: Video },
      { label: 'Watchlist',      path: '/watchlist',     icon: UserCheck },
      { label: 'AI Models',      path: '/ai-models',     icon: BrainCircuit },
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'Case Board',     path: '/case-board',    icon: Briefcase },
      { label: 'Timeline',       path: '/timeline',      icon: Film },
      { label: 'Incidents',      path: '/incidents',     icon: ShieldAlert },
      { label: 'Reports',        path: '/reports',       icon: FileText },
    ]
  },
  {
    title: 'Automation',
    items: [
      { label: 'SOAR Engine',    path: '/soar',          icon: Zap,         badge: 'PRO' },
      { label: 'Playbooks',      path: '/playbooks',     icon: Workflow },
      { label: 'Approvals',      path: '/approvals',     icon: CheckSquare },
      { label: 'SOC Center',     path: '/soc',           icon: Siren },
      { label: 'Predictive Intel', path: '/threats',       icon: ShieldBan,   badge: 'AI' },
    ]
  },
  {
    title: 'Traffic & Analytics',
    items: [
      { label: 'Traffic',        path: '/traffic',       icon: CarFront },
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users',          path: '/users',         icon: Users },
      { label: 'Settings',       path: '/settings',      icon: Settings },
    ]
  }
];
