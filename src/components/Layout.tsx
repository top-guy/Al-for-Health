import React from 'react';
import { User } from 'firebase/auth';
import { Activity, Users, Bell, LogOut, Menu } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  profile: any;
  activeTab: 'diagnose' | 'patients' | 'alerts';
  setActiveTab: (tab: 'diagnose' | 'patients' | 'alerts') => void;
}

export function Layout({ children, user, profile, activeTab, setActiveTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-600 w-6 h-6" />
          <span className="font-bold text-slate-900">HealthGuard</span>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="text-slate-500 p-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-40">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl text-slate-900">HealthGuard</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<Activity />} 
            label="Diagnose" 
            active={activeTab === 'diagnose'} 
            onClick={() => setActiveTab('diagnose')} 
          />
          <NavItem 
            icon={<Users />} 
            label="Patients" 
            active={activeTab === 'patients'} 
            onClick={() => setActiveTab('patients')} 
          />
          <NavItem 
            icon={<Bell />} 
            label="Alerts" 
            active={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-10 h-10 rounded-full border border-slate-200"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.name || user.displayName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{profile?.role || 'CHV'}</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50">
        <MobileNavItem 
          icon={<Activity />} 
          label="Diagnose" 
          active={activeTab === 'diagnose'} 
          onClick={() => setActiveTab('diagnose')} 
        />
        <MobileNavItem 
          icon={<Users />} 
          label="Patients" 
          active={activeTab === 'patients'} 
          onClick={() => setActiveTab('patients')} 
        />
        <MobileNavItem 
          icon={<Bell />} 
          label="Alerts" 
          active={activeTab === 'alerts'} 
          onClick={() => setActiveTab('alerts')} 
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-blue-50 text-blue-600 shadow-sm" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
      {label}
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
        active ? "text-blue-600" : "text-slate-400"
      )}
    >
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
