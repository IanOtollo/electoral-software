"use client";

import { useState } from "react";
import { Plus, Users, Settings, Activity } from "lucide-react";

export default function TallyDashboardPage() {
  const [activeTab, setActiveTab] = useState<"elections" | "stations" | "agents">("elections");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-(--primary)">Tally Setup & Dashboard</h2>
          <p className="text-(--foreground)/70 mt-1">Manage elections, polling stations, and field agents.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-(--primary) text-(--primary-foreground) px-4 py-2 rounded-md font-medium hover:opacity-90 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Dashboard
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-(--foreground)/10 pb-4">
        <button 
          onClick={() => setActiveTab("elections")}
          className={`font-medium px-4 py-2 rounded-md ${activeTab === 'elections' ? 'bg-(--primary)/10 text-(--primary)' : 'text-(--foreground)/70 hover:bg-(--foreground)/5'}`}
        >
          Elections
        </button>
        <button 
          onClick={() => setActiveTab("stations")}
          className={`font-medium px-4 py-2 rounded-md ${activeTab === 'stations' ? 'bg-(--primary)/10 text-(--primary)' : 'text-(--foreground)/70 hover:bg-(--foreground)/5'}`}
        >
          Polling Stations
        </button>
        <button 
          onClick={() => setActiveTab("agents")}
          className={`font-medium px-4 py-2 rounded-md ${activeTab === 'agents' ? 'bg-(--primary)/10 text-(--primary)' : 'text-(--foreground)/70 hover:bg-(--foreground)/5'}`}
        >
          Agents
        </button>
      </div>

      <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm min-h-[500px]">
        {activeTab === "elections" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Configured Elections</h3>
              <button className="text-(--primary) flex items-center gap-1 font-medium hover:underline">
                <Plus className="w-4 h-4"/> New Election
              </button>
            </div>
            
            <div className="border border-(--foreground)/10 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-(--background) border-b border-(--foreground)/10">
                  <tr>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Candidates</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--foreground)/5">
                  <tr>
                    <td className="p-4 font-bold">2027 General Election - Governor</td>
                    <td className="p-4"><span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-mono">setup</span></td>
                    <td className="p-4">4 Candidates</td>
                    <td className="p-4 text-right"><button className="text-(--primary) hover:underline font-medium">Manage</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "stations" && (
          <div className="text-center py-20 text-(--foreground)/50">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Polling Stations Import</h3>
            <p className="max-w-md mx-auto mt-2">Upload a CSV of all IEBC polling stations in your jurisdiction to map them for the parallel tally.</p>
            <button className="mt-6 bg-(--foreground)/10 text-(--foreground) px-4 py-2 rounded-md font-medium hover:bg-(--foreground)/20">
              Import Stations
            </button>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="text-center py-20 text-(--foreground)/50">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Field Agents</h3>
            <p className="max-w-md mx-auto mt-2">Register field agents and assign them exclusively to one polling station. They will log in using their phone number.</p>
            <button className="mt-6 bg-(--primary) text-(--primary-foreground) px-4 py-2 rounded-md font-medium hover:opacity-90">
              Add Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
