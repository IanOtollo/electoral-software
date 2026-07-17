"use client";

import { useState } from "react";
import { Send, Clock, AlertTriangle, Users } from "lucide-react";

export default function CampaignComposerPage() {
  const [message, setMessage] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");

  // Basic character counting and SMS segment estimation (GSM-7)
  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));
  const estimatedCost = segments * 0.8; // Estimated cost per SMS in KES

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-(--primary)">Compose Campaign</h2>
          <p className="text-(--foreground)/70 mt-1">Draft, schedule, and send bulk SMS to your segments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Composer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold mb-4">1. Select Target Segment</h3>
            <select className="w-full border border-(--foreground)/20 rounded-md p-3 bg-(--background)">
              <option value="">-- Choose a Saved Segment --</option>
              <option value="1">All Registered Voters (12,450)</option>
              <option value="2">Ward: North Ward (3,210)</option>
              <option value="3">Tag: youth (1,840)</option>
            </select>
          </div>

          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">2. Compose Message</h3>
              <div className="text-sm space-x-2">
                <button className="text-(--primary) bg-(--primary)/10 px-2 py-1 rounded font-mono text-xs hover:bg-(--primary)/20">{"{{fullName}}"}</button>
                <button className="text-(--primary) bg-(--primary)/10 px-2 py-1 rounded font-mono text-xs hover:bg-(--primary)/20">{"{{ward}}"}</button>
              </div>
            </div>
            
            <textarea
              className="w-full h-40 border border-(--foreground)/20 rounded-md p-4 bg-(--background) focus:ring-2 focus:ring-(--primary) outline-none resize-none font-mono text-sm"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            
            <div className="flex justify-between items-center mt-3 text-sm text-(--foreground)/60">
              <div>
                <span className="font-bold text-(--foreground)">{charCount}</span> chars • <span className="font-bold text-(--foreground)">{segments}</span> SMS segment(s) per recipient
              </div>
              <div>
                Reply <span className="font-mono bg-(--foreground)/10 px-1 rounded">STOP</span> to opt out (Auto-appended if required)
              </div>
            </div>
          </div>

          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold mb-4">3. Delivery Schedule</h3>
            <div className="flex gap-4">
              <label className={`flex-1 border p-4 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${scheduleMode === 'now' ? 'border-(--primary) bg-(--primary)/5' : 'border-(--foreground)/20 hover:border-(--foreground)/40'}`}>
                <input type="radio" name="schedule" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="text-(--primary) focus:ring-(--primary)" />
                <div>
                  <div className="font-bold">Send Immediately</div>
                  <div className="text-xs text-(--foreground)/60 mt-1">Campaign starts processing now</div>
                </div>
              </label>
              
              <label className={`flex-1 border p-4 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${scheduleMode === 'later' ? 'border-(--primary) bg-(--primary)/5' : 'border-(--foreground)/20 hover:border-(--foreground)/40'}`}>
                <input type="radio" name="schedule" checked={scheduleMode === 'later'} onChange={() => setScheduleMode('later')} className="text-(--primary) focus:ring-(--primary)" />
                <div>
                  <div className="font-bold">Schedule for Later</div>
                  <div className="text-xs text-(--foreground)/60 mt-1">Pick a date and time</div>
                </div>
              </label>
            </div>
            
            {scheduleMode === 'later' && (
              <div className="mt-4 flex gap-4">
                <input type="datetime-local" className="border border-(--foreground)/20 rounded-md p-2 bg-(--background)" />
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Summary & Send */}
        <div className="lg:col-span-1">
          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm sticky top-6">
            <h3 className="font-bold text-lg mb-4 border-b border-(--foreground)/10 pb-2">Campaign Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-(--foreground)/70 flex items-center gap-2"><Users className="w-4 h-4"/> Recipients</span>
                <span className="font-mono font-bold">12,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-(--foreground)/70 flex items-center gap-2"><Send className="w-4 h-4"/> Sender ID</span>
                <span className="font-mono font-bold bg-(--foreground)/10 px-2 py-1 rounded">22344</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--foreground)/10 pt-4">
                <span className="font-bold">Est. Cost</span>
                <span className="font-mono font-bold text-xl text-(--primary)">KES {(estimatedCost * 12450).toLocaleString()}</span>
              </div>
            </div>

            <button className="w-full bg-(--primary) text-(--primary-foreground) font-bold text-lg py-4 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
              <Send className="w-5 h-5" />
              {scheduleMode === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
            </button>
            
            <p className="text-xs text-center text-(--foreground)/50 mt-4 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              This action requires Campaign Manager privileges and will log an audit entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
