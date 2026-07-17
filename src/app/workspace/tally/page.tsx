"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import { Activity, CheckCircle, Share2, Users, Maximize2, Loader2, Copy, Plus, X, Vote, MapPin, Trash2, RefreshCcw, ChevronDown, Sun, Moon, Lock, Unlock } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getCounties, getConstituenciesByCounty, getWardsByConstituency } from "osm-kenya-boundaries";
import { useTheme } from "next-themes";

function ElectionSetup({ campaign }: { campaign: any }) {
  const configure = useMutation(api.campaigns.configureCampaign);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Candidates
  const [candidates, setCandidates] = useState<string[]>(
    campaign.candidates?.length ? campaign.candidates : ["", ""] // Default to 2 empty slots
  );

  const [form, setForm] = useState({
    office: campaign.office || "President",
    country: "Kenya",
    county: "",
    constituency: "",
    ward: "",
  });

  const counties = useMemo(() => getCounties(), []);
  const constituencies = useMemo(() => form.county ? getConstituenciesByCounty(form.county) : [], [form.county]);
  const wards = useMemo(() => form.constituency ? getWardsByConstituency(form.constituency) : [], [form.constituency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCandidates = candidates.filter(c => c.trim().length > 0);
    if (validCandidates.length < 1) {
      alert("Please enter at least one candidate.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await configure({
        campaignId: campaign._id,
        candidates: validCandidates,
        office: form.office,
        country: form.country,
        county: form.county,
        constituency: form.constituency,
        ward: form.ward,
      });
    } catch (error) {
      alert("Failed to initialize system");
      setIsSubmitting(false);
    }
  };

  const updateCandidate = (index: number, val: string) => {
    const newCandidates = [...candidates];
    newCandidates[index] = val;
    setCandidates(newCandidates);
  };

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const addCandidate = () => {
    setCandidates([...candidates, ""]);
  };

  return (
    <div className="w-full flex items-center justify-center transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col relative animate-in fade-in zoom-in-95 duration-500 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Election Setup</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors">Set up your election details before starting.</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
            <Vote className="w-5 h-5 text-slate-900 dark:text-white" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            
            {/* Left Column: Candidates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Participating Politicians</label>
                 <button type="button" onClick={addCandidate} className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-1">
                   <Plus className="w-3 h-3" /> Add
                 </button>
              </div>
              
              <div className="space-y-3">
                {candidates.map((candidate, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Candidate ${index + 1} Name`}
                      value={candidate}
                      onChange={(e) => updateCandidate(index, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#06080F] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-medium"
                      required
                    />
                    <button type="button" onClick={() => removeCandidate(index)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Context */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">Seat Contested</label>
                <div className="relative w-full">
                  <select required className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all cursor-pointer font-medium" value={form.office} onChange={e => setForm({...form, office: e.target.value})}>
                    <option>President</option>
                    <option>Governor</option>
                    <option>Senator</option>
                    <option>Woman Rep</option>
                    <option>Member of Parliament (MP)</option>
                    <option>Member of County Assembly (MCA)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">Country</label>
                  <div className="relative w-full">
                    <select disabled className="w-full appearance-none bg-slate-50 dark:bg-[#06080F] border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-10 py-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      <option>Kenya</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors">County</label>
                    <span className="text-[10px] text-slate-400 font-medium">47</span>
                  </div>
                  <div className="relative w-full">
                    <select required className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all cursor-pointer font-medium" value={form.county} onChange={e => setForm({...form, county: e.target.value, constituency: "", ward: ""})}>
                      <option value="" disabled>Select...</option>
                      {counties.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Constituency</label>
                    {form.county && <span className="text-[10px] text-slate-400 font-medium">{constituencies.length}</span>}
                  </div>
                  <div className="relative w-full">
                    <select required={form.office !== "President" && form.office !== "Governor" && form.office !== "Senator" && form.office !== "Woman Rep"} disabled={!form.county} className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all cursor-pointer font-medium disabled:opacity-50" value={form.constituency} onChange={e => setForm({...form, constituency: e.target.value, ward: ""})}>
                      <option value="" disabled>Select...</option>
                      {constituencies.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Ward</label>
                    {form.constituency && <span className="text-[10px] text-slate-400 font-medium">{wards.length}</span>}
                  </div>
                  <div className="relative w-full">
                    <select required={form.office === "Member of County Assembly (MCA)"} disabled={!form.constituency} className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all cursor-pointer font-medium disabled:opacity-50" value={form.ward} onChange={e => setForm({...form, ward: e.target.value})}>
                      <option value="">All Wards</option>
                      {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <button disabled={isSubmitting} type="submit" className="w-full mt-auto shrink-0 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Start Tracking"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TallyDashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const campaign = useQuery(api.campaigns.getAdminCampaign);
  const liveSubmissions = useQuery(api.submissions.getLiveSubmissions, { 
    campaignId: campaign?._id 
  });
  const agents = useQuery(api.campaigns.getCampaignAgents, { 
    campaignId: campaign?._id 
  });
  
  const createAgent = useMutation(api.campaigns.createAgent);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Livestream State
  const [isStreamLive, setIsStreamLive] = useState(false);
  const videoContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", phone: "", designation: "" });

  const stats = useMemo(() => {
    if (!liveSubmissions || !campaign?.candidates) return { totalVotes: 0, candidateMap: {}, anomalies: 0, reportingStations: 0, topCandidates: [] };
    
    let invalid = 0;
    let anomalies = 0;
    const uniqueStations = new Set();
    const candidateMap: Record<string, number> = {};
    
    campaign.candidates.forEach((c: string) => candidateMap[c] = 0);

    liveSubmissions.forEach(sub => {
      if (sub.results && sub.results.candidateVotes) {
         sub.results.candidateVotes.forEach((cv: any) => {
           if (candidateMap[cv.name] !== undefined) {
             candidateMap[cv.name] += cv.votes;
           } else {
             // Fallback for older submissions if any
             candidateMap[cv.name] = cv.votes;
           }
         });
      }
      invalid += (sub.results.invalidVotes || 0);
      uniqueStations.add(sub.stationId);
      if (sub.status === "FLAGGED") anomalies++;
    });

    let totalCandidateVotes = 0;
    const topCandidates = Object.entries(candidateMap)
      .map(([name, votes]) => ({ name, votes }))
      .sort((a, b) => (b.votes as number) - (a.votes as number));
      
    topCandidates.forEach(c => totalCandidateVotes += (c.votes as number));

    return {
      totalVotes: totalCandidateVotes + invalid,
      candidateMap,
      anomalies,
      reportingStations: uniqueStations.size,
      topCandidates
    };
  }, [liveSubmissions, campaign]);

  const chartData = useMemo(() => {
    if (!stats.topCandidates) return [];
    
    // Assign a color palette dynamically to the top candidates
    const colors = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];
    return stats.topCandidates.map((c, i) => ({
      name: c.name,
      votes: c.votes,
      color: colors[i % colors.length]
    }));
  }, [stats]);

  const seed = useMutation(api.campaigns.seedCampaign);
  const deleteAgent = useMutation(api.campaigns.deleteAgent);
  const updateAgentPin = useMutation(api.campaigns.updateAgentPin);
  const resetDeviceBinding = useMutation(api.campaigns.resetDeviceBinding);

  React.useEffect(() => {
    if (campaign === null) {
      seed();
    }
  }, [campaign, seed]);

  if (campaign === undefined || campaign === null || liveSubmissions === undefined || agents === undefined) {
    return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-900 dark:text-white w-8 h-8" /></div>;
  }

  // GATEKEEPER: Setup Screen
  if (!campaign.isConfigured) {
    return <ElectionSetup campaign={campaign} />;
  }

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    setIsProvisioning(true);
    try {
      await createAgent({
        campaignId: campaign._id,
        name: newAgent.name,
        phone: newAgent.phone,
        designation: newAgent.designation,
      });
      setNewAgent({ name: "", phone: "", designation: "" });
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to provision agent");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };
  
  const leadMargin = stats.topCandidates.length >= 2 
    ? (stats.topCandidates[0].votes as number) - (stats.topCandidates[1].votes as number)
    : 0;

  return (
    <div className="flex flex-col gap-6 pb-12 relative animate-in slide-in-from-bottom-4 fade-in duration-700">
      
      {/* Context Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
         <div className="flex flex-col">
           <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 transition-colors">Active Election Context</span>
           <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
             {campaign.office}: {campaign.candidates?.map((c: string, i: number, arr: string[]) => (
               <span key={i}>
                 <span className="italic">{c}</span>
                 {i < arr.length - 1 ? " vs " : ""}
               </span>
             ))}
           </h2>
         </div>
         <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
           <MapPin className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
           {campaign.county && <span>{campaign.county} County</span>}
           {campaign.constituency && <span> &bull; {campaign.constituency}</span>}
           {campaign.ward && <span> &bull; {campaign.ward} Ward</span>}
         </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Total Votes Counted" value={stats.totalVotes.toLocaleString()} trend="Live" color="text-slate-900 dark:text-white" />
        <KPICard title="Reporting Stations" value={stats.reportingStations.toString()} subtext="Active data feeds" color="text-slate-900 dark:text-white" />
        <KPICard title="Lead Margin" value={leadMargin.toLocaleString()} subtext={stats.topCandidates[0]?.name + " leads"} color="text-slate-900 dark:text-white" bg="bg-white dark:bg-slate-900" border="border-slate-200 dark:border-slate-800" />
        <KPICard title="Agents Deployed" value={agents.length.toString()} subtext="Secured agent links" color="text-slate-900 dark:text-white" />
      </div>

      {/* Main Split View */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[65%] flex flex-col gap-6">
          
          {/* Chart Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 flex flex-col min-h-[350px] transition-colors">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Live National Tally</h2>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                </span>
                LIVE UPDATES
              </div>
            </div>
            
            <div className="flex-1 w-full dark:opacity-90">
              <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 50)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 600}} width={120} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incoming Submissions Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 h-[350px] flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider transition-colors">Incoming Agent Results</h2>
            </div>
            
            <div className="overflow-y-auto pr-3 space-y-3 custom-scrollbar">
              {liveSubmissions.length === 0 ? (
                <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center gap-3 transition-colors">
                  <p>No agent results yet.</p>
                  <p>Click <strong className="dark:text-slate-300">Add New Agent</strong> on the right to provision an agent link and submit test data!</p>
                </div>
              ) : liveSubmissions.map((sub) => (
                <div key={sub._id} className="flex flex-col p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{sub.stationName} <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">({sub.stationCode})</span></p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">Agent: {sub.agentName} • {sub.agentPhone}</p>
                    </div>
                    <div className="text-right">
                       <span className={`inline-flex mt-1 items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors ${sub.status === 'VERIFIED' ? 'text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : sub.status === 'FLAGGED' ? 'text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                          {sub.status}
                       </span>
                    </div>
                  </div>
                  
                  {/* Dynamic Vote Breakdown */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    {sub.results?.candidateVotes?.map((cv: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{cv.name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{cv.votes.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">Invalid Votes</span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-300">{sub.results?.invalidVotes?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          
          {/* Custom Livestream Embed */}
          <div ref={videoContainerRef} className="bg-slate-900 dark:bg-slate-900/80 dark:border dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col transition-colors">
            <div className="aspect-video bg-black relative flex items-center justify-center group">
              
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={toggleFullscreen} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-slate-600 flex flex-col items-center">
                <Activity className={`w-8 h-8 mb-2 ${isStreamLive ? "text-green-500 animate-pulse opacity-100" : "opacity-50"}`} />
                <span className={`text-xs font-bold tracking-widest uppercase ${isStreamLive ? "text-green-500" : "text-slate-500"}`}>
                  {isStreamLive ? "LIVE BROADCAST" : "STREAM OFFLINE"}
                </span>
                
                {!isStreamLive && (
                  <button onClick={() => setIsStreamLive(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg">
                    Start Stream
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-5 flex items-center justify-between bg-slate-900 dark:bg-[#0A0E17] transition-colors">
              <div>
                <h3 className="text-white font-bold text-sm">National Tally Center</h3>
                <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> 0 watching
                </p>
              </div>
              <button disabled={!isStreamLive} className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 dark:border ${isStreamLive ? 'bg-slate-700 hover:bg-slate-600 text-white dark:border-slate-600 cursor-pointer' : 'bg-slate-800/50 text-slate-600 dark:border-slate-800/50 cursor-not-allowed'}`}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>

          {/* Provisioned Agents Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 flex-1 flex flex-col min-h-[300px] transition-colors">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 transition-colors">
                  <Users className="w-4 h-4 text-slate-900 dark:text-white" />
                  Active Agents
               </h2>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
               >
                 <Plus className="w-3.5 h-3.5" /> Add Agent
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {agents.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-10 transition-colors">No agents provisioned yet. Click "Add Agent" to start.</div>
                ) : agents.map(agent => (
                  <div key={agent._id} className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-between group hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white transition-colors">{agent.name}</p>
                        <span className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50">
                          PIN: {agent.pinCode || "----"}
                        </span>
                        {agent.boundDeviceId && (
                          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                            <Lock className="w-3 h-3" /> DEVICE BOUND
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors mt-0.5">{agent.designation} • {agent.phone}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {agent.boundDeviceId && (
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to unlink ${agent.name}'s device? This will allow them to log in on a new device.`)) {
                              resetDeviceBinding({ agentId: agent._id });
                            }
                          }}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5"
                          title="Unlink Device"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Unlink</span>
                        </button>
                      )}
                      <button 
                        onClick={() => updateAgentPin({ agentId: agent._id })}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5"
                        title="Regenerate Security PIN"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset PIN</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to completely revoke access for ${agent.name}?`)) {
                            deleteAgent({ agentId: agent._id });
                          }
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      <button 
                        onClick={() => handleCopyLink(agent.uniqueToken)}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Copy Unique Secure Link"
                      >
                        {copiedToken === agent.uniqueToken ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>

      {/* Add Agent Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-colors">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Provision New Agent</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">Generate a secure, locked upload link</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 transition-colors">Agent Full Name</label>
                <input required type="text" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="e.g. Jane Omondi" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 transition-colors">Phone Number</label>
                <input required type="tel" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="e.g. 0712 345 678" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 transition-colors">Designation & Station</label>
                <input required type="text" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="e.g. Presiding Agent - Kibera Primary" value={newAgent.designation} onChange={e => setNewAgent({...newAgent, designation: e.target.value})} />
              </div>
              
              <div className="pt-4">
                <button disabled={isProvisioning} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold py-3.5 rounded-xl shadow-md transition-all duration-200 flex justify-center items-center gap-2">
                  {isProvisioning ? <Loader2 className="animate-spin w-5 h-5" /> : "Generate Secure Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function KPICard({ title, value, subtext, trend, color, bg = "bg-white dark:bg-slate-900", border = "border-slate-200 dark:border-slate-800" }: any) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 md:p-6 flex flex-col shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}>
      <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 md:mb-3 transition-colors line-clamp-2 md:line-clamp-1 leading-tight">{title}</span>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-auto gap-1 sm:gap-0">
        <span className={`text-2xl md:text-4xl font-bold tracking-tight transition-colors ${color} truncate`}>{value}</span>
        {trend && <span className="text-[9px] md:text-[10px] font-bold text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 md:px-2 md:py-1 rounded uppercase tracking-wider transition-colors w-fit">{trend}</span>}
        {subtext && <span className="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 transition-colors truncate">{subtext}</span>}
      </div>
    </div>
  );
}
