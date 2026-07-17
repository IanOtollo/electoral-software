"use client";

import { CreditCard, CheckCircle2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const currentPlan = "Starter";
  const modules = ["sms"]; // 'tally' is missing

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-(--primary)">Campaign Settings</h2>
        <p className="text-(--foreground)/70 mt-1">Manage your tenant profile and billing.</p>
      </div>

      <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold border-b border-(--foreground)/10 pb-4 mb-4">Licensed Modules</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-(--primary) bg-(--primary)/5 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-(--primary) shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Bulk SMS Module</div>
              <div className="text-sm text-(--foreground)/70 mt-1">Active. Up to 5,000 contacts.</div>
            </div>
          </div>
          
          <div className="border border-(--foreground)/20 bg-(--foreground)/5 p-4 rounded-xl flex items-start gap-3 opacity-70">
            <ShieldAlert className="w-6 h-6 text-(--foreground)/50 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Vote Tally Tracker</div>
              <div className="text-sm text-(--foreground)/70 mt-1 mb-3">Not licensed for this tenant.</div>
              <button className="bg-(--foreground) text-(--background) px-4 py-2 rounded font-medium text-sm hover:opacity-90">
                Upgrade to Constituency Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold border-b border-(--foreground)/10 pb-4 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5"/> Billing Details
        </h3>
        <p className="text-sm text-(--foreground)/70 mb-6">You are currently on the <strong>{currentPlan}</strong> plan.</p>
        
        <div className="bg-(--background) border border-(--foreground)/10 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">SMS Credits Balance</span>
            <span className="font-mono font-bold text-lg">KES 4,500</span>
          </div>
          <button className="text-(--primary) font-medium text-sm hover:underline">Top Up Balance</button>
        </div>
      </div>
    </div>
  );
}
