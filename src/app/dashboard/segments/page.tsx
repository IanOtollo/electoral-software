"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Filter, Users, Tag } from "lucide-react";

export default function SegmentsPage() {
  // const voters = useQuery(api.contacts.getVoters, { tenantId: "..." }); // To be wired up with Auth
  
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Dummy data for UI building
  const availableWards = ["Ward 1", "Ward 2", "North Ward", "Central"];
  const availableTags = ["youth", "elderly", "rally_attended", "donor"];
  
  const toggleWard = (w: string) => {
    setSelectedWards(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  };

  const toggleTag = (t: string) => {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-(--primary)">Segments Builder</h2>
          <p className="text-(--foreground)/70 mt-1">Create targeted lists for your SMS campaigns.</p>
        </div>
        <button className="bg-(--primary) text-(--primary-foreground) px-4 py-2 rounded-md font-medium hover:opacity-90">
          Save Segment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filter Controls */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Filter className="w-4 h-4 text-(--primary)"/> Filter by Ward</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableWards.map(ward => (
                <label key={ward} className="flex items-center gap-3 p-2 hover:bg-(--foreground)/5 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-(--foreground)/20 text-(--primary) focus:ring-(--primary)"
                    checked={selectedWards.includes(ward)}
                    onChange={() => toggleWard(ward)}
                  />
                  <span className="text-sm font-medium">{ward}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-(--primary)"/> Filter by Tags (AND)</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    selectedTags.includes(tag) 
                    ? "bg-(--primary) text-(--primary-foreground)" 
                    : "bg-(--foreground)/5 text-(--foreground)/70 hover:bg-(--foreground)/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Preview */}
        <div className="md:col-span-2">
          <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-5 border-b border-(--foreground)/10 bg-(--foreground)/5 flex justify-between items-center">
              <div>
                <h3 className="font-bold">Segment Preview</h3>
                <p className="text-xs text-(--foreground)/60 mt-1">Opted-out contacts are ALWAYS excluded.</p>
              </div>
              <div className="bg-(--background) border border-(--foreground)/10 px-4 py-2 rounded-lg text-center">
                <div className="text-2xl font-mono font-bold text-(--primary)">0</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-(--foreground)/50">Recipients</div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-(--background) sticky top-0 border-b border-(--foreground)/10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Ward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--foreground)/5">
                  {/* Empty state for now until wired up */}
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-(--foreground)/50">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      Select filters on the left to build your segment.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
