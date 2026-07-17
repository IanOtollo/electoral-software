"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Send, LayoutDashboard, Database, Settings, Activity, ChevronRight, LogOut, ShieldCheck } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Voter Data", href: "/dashboard/import", icon: Database },
    { name: "Segments", href: "/dashboard/segments", icon: Users },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: Send },
    { name: "Tally Tracker", href: "/dashboard/tally", icon: Activity },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex overflow-hidden selection:bg-green-600 selection:text-white">
      {/* Sidebar - Strict Enterprise */}
      <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center mr-3">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate">
            Electoral Software
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? "text-slate-900" : "text-slate-500"}`} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 shrink-0">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>Workspace</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-slate-900 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Demo Campaign
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-sm font-mono font-bold tracking-wider uppercase">
              Parallel Tally Active
            </span>
            
            {/* User Avatar */}
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 ml-2 cursor-pointer hover:bg-slate-200 transition-colors">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
