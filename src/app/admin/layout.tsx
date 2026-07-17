"use client";

import { ShieldAlert, Database, Server, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-black border-r border-slate-800 shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
          <ShieldAlert className="w-5 h-5 text-indigo-500 mr-2" />
          <span className="text-white font-bold tracking-wider uppercase text-sm">Platform Admin</span>
        </div>
        <div className="p-4 flex-1 space-y-1">
          <NavItem href="/admin" icon={<Database className="w-4 h-4" />} label="Provisioning Engine" active={pathname === "/admin"} />
          <NavItem href="#" icon={<Users className="w-4 h-4" />} label="Active Workspaces" active={false} />
          <NavItem href="#" icon={<Server className="w-4 h-4" />} label="System Health" active={false} />
        </div>
        <div className="p-4 border-t border-slate-800">
          <NavItem href="#" icon={<Settings className="w-4 h-4" />} label="Global Settings" active={false} />
        </div>
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center px-8 shrink-0 bg-slate-900">
          <h1 className="text-white font-medium">Super Admin Console</h1>
          <span className="ml-auto text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">God Mode</span>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: any) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
