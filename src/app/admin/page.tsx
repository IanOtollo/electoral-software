"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Database, PlusCircle, CheckCircle, Activity, Globe } from "lucide-react";

export default function SuperAdminProvisioning() {
  const [form, setForm] = useState({ name: "", office: "", region: "" });
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [successLink, setSuccessLink] = useState("");

  // Using seedCampaign for MVP, but a real app would use a generic createCampaign mutation
  const seedCampaign = useMutation(api.campaigns.seedCampaign);
  
  // Just to get total active workspaces
  const activeCampaign = useQuery(api.campaigns.getAdminCampaign);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    try {
      // In a real scenario, we pass form data to a createCampaign mutation
      await seedCampaign();
      setSuccessLink(`${window.location.origin}/upload/nairobi-decides-2027`);
    } catch (e) {
      alert("Failed to provision workspace.");
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      
      {/* Platform KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PlatformKPI title="Active Subscriptions" value={activeCampaign ? "1" : "0"} icon={<Database className="w-5 h-5 text-indigo-400" />} />
        <PlatformKPI title="Global Processed Votes" value="96,560" icon={<Activity className="w-5 h-5 text-green-400" />} />
        <PlatformKPI title="Platform Health" value="100% Uptime" icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Provisioning Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            Provision New Workspace
          </h2>
          <form onSubmit={handleProvision} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Politician Name</label>
              <input required type="text" className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Hon. John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Office Seeking</label>
                <input required type="text" className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Governor" value={form.office} onChange={e => setForm({...form, office: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Region</label>
                <input required type="text" className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Nairobi" value={form.region} onChange={e => setForm({...form, region: e.target.value})} />
              </div>
            </div>
            <div className="pt-4">
              <button disabled={isProvisioning} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex justify-center items-center">
                {isProvisioning ? "Provisioning Server Resources..." : "Generate Workspace & Invite Link"}
              </button>
            </div>
          </form>

          {successLink && (
            <div className="mt-6 bg-green-900/30 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-400 font-bold text-sm mb-2">Workspace Provisioned Successfully!</p>
              <p className="text-slate-300 text-xs mb-1">Hand this link to the politician for their agents:</p>
              <code className="block bg-black p-2 rounded text-indigo-300 text-xs break-all">{successLink}</code>
            </div>
          )}
        </div>

        {/* Global Live Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Global Platform Feed
          </h2>
          <div className="space-y-4">
             <div className="p-3 bg-black border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Just now • System Health</p>
                <p className="text-sm text-white font-medium">Automatic database backup completed securely.</p>
             </div>
             <div className="p-3 bg-black border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">2 mins ago • Subscription Event</p>
                <p className="text-sm text-white font-medium">Hon. David Ochieng workspace renewed for 30 days.</p>
             </div>
             <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                <p className="text-xs text-indigo-400 mb-1">5 mins ago • Global Traffic</p>
                <p className="text-sm text-indigo-100 font-medium">Traffic spike detected on Nairobi servers. Auto-scaling initiated.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function PlatformKPI({ title, value, icon }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
      <div className="p-3 bg-black rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}
