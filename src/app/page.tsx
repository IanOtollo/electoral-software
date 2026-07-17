"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Database, Send, Activity, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ModuleType = "tally" | "sms" | "both";

export default function EnterpriseGateway() {
  const [selected, setSelected] = useState<ModuleType>("both");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const modules: ModuleType[] = ["both", "tally", "sms"];
    const interval = setInterval(() => {
      setSelected(current => {
        const currentIndex = modules.indexOf(current);
        return modules[(currentIndex + 1) % modules.length];
      });
    }, 6000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col overflow-hidden selection:bg-green-600 selection:text-white">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-slate-200 bg-white shrink-0 z-20 relative">
        <div className="h-full px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Electoral Software</span>
          </div>
        </div>
      </nav>

      {/* Split Screen Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* LEFT SIDE: Selection & Context */}
        <div className="w-full lg:w-[45%] p-6 md:p-12 xl:p-16 flex flex-col lg:h-full lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 bg-white relative z-10 shrink-0">
          <div className="max-w-xl mx-auto w-full">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
              Select your Electoral Software.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed mb-10">
              Choose the tools you need. The software has two main parts: a system for counting votes and a system for sending bulk SMS messages.
            </p>

            {/* Selection Grid */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Tally Tracker */}
                <button 
                  onClick={() => { setSelected("tally"); setIsAutoPlaying(false); }}
                  className={`cursor-pointer text-left p-5 rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                    selected === "tally" 
                      ? "border-green-600 bg-green-50 shadow-[0_0_0_1px_rgba(22,163,74,1)]" 
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Activity className={`w-6 h-6 mb-4 ${selected === "tally" ? "text-green-700" : "text-slate-500"}`} />
                  <h2 className="text-sm font-bold text-slate-900 mb-1">Vote Tally Tracker</h2>
                  <p className="text-xs text-slate-500 line-clamp-2">Track votes in real-time and automatically scan result forms.</p>
                </button>

                {/* Bulk SMS */}
                <button 
                  onClick={() => { setSelected("sms"); setIsAutoPlaying(false); }}
                  className={`cursor-pointer text-left p-5 rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                    selected === "sms" 
                      ? "border-blue-600 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,1)]" 
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Send className={`w-6 h-6 mb-4 ${selected === "sms" ? "text-blue-700" : "text-slate-500"}`} />
                  <h2 className="text-sm font-bold text-slate-900 mb-1">Voter Outreach (SMS)</h2>
                  <p className="text-xs text-slate-500 line-clamp-2">Send bulk SMS messages and group your contacts easily.</p>
                </button>
              </div>

              {/* Complete Suite (The "Blue" One on Bottom) */}
              <button 
                onClick={() => { setSelected("both"); setIsAutoPlaying(false); }}
                className={`cursor-pointer text-left relative p-6 rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                  selected === "both" 
                    ? "border-slate-900 bg-slate-900 shadow-lg" 
                    : "border-slate-800 bg-slate-800 hover:bg-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="absolute top-0 right-0 bg-white text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                  Recommended
                </div>
                <Database className="w-6 h-6 text-white mb-4" />
                <h2 className="text-base font-bold text-white mb-1">Both Modules</h2>
                <p className="text-xs text-slate-400">
                  Get everything. Combine vote tracking and bulk SMS sending in one complete system.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Interactive Details & CTA */}
        <div className="flex w-full lg:w-[55%] bg-[#F8FAFC] p-8 md:p-12 xl:p-20 relative overflow-hidden flex-col justify-center min-h-[600px] lg:min-h-0">
          
          {/* Dynamic Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-100"
            style={{ 
              backgroundImage: `url('/${
                selected === "tally" ? "tally-preview" : 
                selected === "sms" ? "sms-preview" : 
                "suite-preview"
              }.png')`
            }}
          />

          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#F8FAFC]/95 via-[#F8FAFC]/40 to-transparent pointer-events-none" />

          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          <div className="max-w-2xl w-full mx-auto relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-slate-800 drop-shadow-[0_0_10px_rgba(255,255,255,1)]" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,1)]">System Features</h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full"
              >
                <h2 className="text-4xl font-bold text-slate-900 mb-8 leading-tight h-24 drop-shadow-[0_0_15px_rgba(255,255,255,1)]">
                  {selected === "tally" && "Vote Tally Tracking System"}
                  {selected === "sms" && "Bulk SMS and Voter Outreach"}
                  {selected === "both" && "The Complete Electoral System"}
                </h2>

                <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-8 mb-10 h-64">
                  <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                    {selected === "tally" && (
                      <>
                        <SpecRow label="Polling Stations" value="Up to 5,000 Stations" />
                        <SpecRow label="Field Agents" value="Unlimited Agents" />
                        <SpecRow label="Data Processing" value="Automatic Form Scanning" />
                        <SpecRow label="Analytics" value="Live Alerts for Bad Data" />
                      </>
                    )}
                    {selected === "sms" && (
                      <>
                        <SpecRow label="Speed" value="100 messages per second" />
                        <SpecRow label="Provider" value="Africa's Talking Network" />
                        <SpecRow label="Contact Groups" value="Create Custom Groups" />
                        <SpecRow label="Reports" value="Live Delivery Status" />
                      </>
                    )}
                    {selected === "both" && (
                      <>
                        <SpecRow label="Security" value="Private and Secure System" />
                        <SpecRow label="Polling Stations" value="Up to 5,000 Stations" />
                        <SpecRow label="SMS Sending" value="Fast Bulk Messages" />
                        <SpecRow label="Activity History" value="Secure Activity Logs" />
                      </>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <Link 
                  href={selected === "sms" ? "/workspace/sms" : selected === "both" ? "/workspace/both" : "/workspace/tally"}
                  className="group inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-xl w-auto"
                >
                  {selected === "tally" && "Get started on Vote Tally Tracker"}
                  {selected === "sms" && "Get started on Voter Outreach (SMS)"}
                  {selected === "both" && "Get started on Both (Tally & SMS)"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-sm text-slate-500 mt-4 font-medium">
                  Requires admin setup before you can start.
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function SpecRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{label}</span>
      <span className="text-base font-bold text-slate-900 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{value}</span>
    </div>
  );
}
