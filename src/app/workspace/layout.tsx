"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Activity, Moon, Sun, ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSystemActive, setIsSystemActive] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-slate-300 flex flex-col overflow-hidden transition-colors duration-300 selection:bg-green-600 selection:text-white dark:selection:bg-indigo-500/30">
      
      {/* Top Navigation */}
      <nav className="h-16 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A0E17]/80 dark:backdrop-blur-xl shrink-0 z-20 relative shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="h-full px-6 md:px-10 flex items-center justify-between">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 dark:bg-gradient-to-br dark:from-indigo-500 dark:to-cyan-400 rounded flex items-center justify-center dark:shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">Electoral Software</span>
          </div>

          <div className="flex items-center space-x-6">
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                title="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full px-6 md:px-10 py-6 overflow-y-auto overflow-x-hidden relative">
        {/* Subtle background glow for dark mode only */}
        <div className="hidden dark:block absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="hidden dark:block absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-50 mb-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Go Back
          </button>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
