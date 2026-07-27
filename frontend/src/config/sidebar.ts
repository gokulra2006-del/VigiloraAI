import React from 'react';
import { 
  BrainCircuit, LayoutDashboard, Settings, ShieldAlert, 
  Activity, CarFront, Siren, ShieldBan, Map as MapIcon, 
  FileText, Users 
} from 'lucide-react';

export interface SidebarItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

export interface SidebarSectionConfig {
  title: string;
  items: SidebarItemConfig[];
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Live Feed', path: '/feed', icon: Activity },
      { label: 'GIS Map', path: '/map', icon: MapIcon },
    ]
  },
  {
    title: 'Traffic Operations',
    items: [
      { label: 'Traffic Analytics', path: '/traffic', icon: CarFront },
    ]
  },
  {
    title: 'AI & Analytics',
    items: [
      { label: 'AI Models', path: '/ai-models', icon: BrainCircuit },
      { label: 'Reports', path: '/reports', icon: FileText },
    ]
  },
  {
    title: 'SOC & Security',
    items: [
      { label: 'Incidents', path: '/incidents', icon: ShieldAlert },
      { label: 'SOC Center', path: '/soc', icon: Siren },
      { label: 'Threat Intel', path: '/threats', icon: ShieldBan },
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];
