"use client";

import { Database, Activity, Send } from "lucide-react";
import Link from "next/link";

export default function BothDashboard() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center mb-6">
        <Database className="w-10 h-10 text-white dark:text-slate-900" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Complete Electoral System</h1>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-lg mb-10">
        You have activated the complete suite. Choose which module you want to manage right now.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link href="/workspace/tally" className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vote Tally Tracker</h3>
          <p className="text-sm text-slate-500">Manage polling stations, verify incoming form data, and track election results live.</p>
        </Link>
        
        <Link href="/workspace/sms" className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Voter Outreach (SMS)</h3>
          <p className="text-sm text-slate-500">Send bulk SMS campaigns, manage voter contact lists, and view real-time delivery logs.</p>
        </Link>
      </div>
    </div>
  );
}
