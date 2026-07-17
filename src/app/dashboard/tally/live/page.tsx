"use client";

import { Activity, MapPin, CheckCircle, AlertTriangle, TrendingUp, Download, Printer } from "lucide-react";

export default function LiveTallyDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">
              Parallel Tally
            </span>
            <span className="flex items-center gap-1.5 text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-200 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              Live Feed
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">2027 General Election</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Busia County - Gubernatorial Race</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col items-end">
          <div className="text-3xl font-mono font-bold text-slate-900">64.0%</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Forms Verified (124 / 194)</div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Candidates Leaderboard */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Current Standings
            </h2>
            <div className="flex gap-2">
              <button className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50"><Download className="w-4 h-4"/></button>
              <button className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50"><Printer className="w-4 h-4"/></button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
            
            {/* Candidate 1 */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-green-50 border border-green-200 flex items-center justify-center font-bold text-green-700">1</div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">Paul Otuoma</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">ODM Party</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-slate-900">124,560</div>
                  <div className="text-sm text-green-700 font-bold mt-0.5">52.4%</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-green-600 rounded" style={{ width: '52.4%' }} />
              </div>
            </div>

            {/* Candidate 2 */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-600">2</div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">Sospeter Ojaamong</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">UDA Party</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-slate-900">98,230</div>
                  <div className="text-sm text-slate-600 font-bold mt-0.5">41.3%</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-slate-600 rounded" style={{ width: '41.3%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Status & Wards */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-slate-400"/> Wards Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { name: "Matayos South", percent: 98, color: "text-green-700", bar: "bg-green-600" },
                { name: "Busibwabo", percent: 85, color: "text-green-700", bar: "bg-green-600" },
                { name: "Burumba", percent: 42, color: "text-amber-600", bar: "bg-amber-500" }
              ].map((ward) => (
                <div key={ward.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-medium text-sm text-slate-700">{ward.name}</span>
                    <span className={`font-mono text-xs font-bold ${ward.color}`}>{ward.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                    <div className={`h-full ${ward.bar} rounded`} style={{ width: `${ward.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider">
               System Integrity
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-amber-800">3 Submissions Flagged</div>
                  <div className="text-xs text-amber-700/80 mt-1 leading-relaxed">Pending admin OCR reconciliation to verify source photos.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-100">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-green-800">Zero Outliers Detected</div>
                  <div className="text-xs text-green-700/80 mt-1 leading-relaxed">All verified station totals fall within registered voter limits.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
