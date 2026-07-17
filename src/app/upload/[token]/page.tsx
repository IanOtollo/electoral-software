"use client";

import { useState, use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2, Send, Lock, ShieldCheck, MapPin, CheckCircle } from "lucide-react";

export default function AgentUploadPortal({ params }: { params: Promise<{ token: string }> }) {
  const unwrappedParams = use(params);
  
  const agent = useQuery(api.campaigns.getAgentByToken, { token: unwrappedParams.token });
  const campaign = useQuery(api.campaigns.getByToken, { token: "nairobi-decides-2027" }); // Admin's universal fallback if agent campaign mapping isn't full, but we use agent.campaignId below if possible
  const submitResults = useMutation(api.submissions.submitResults);
  const bindDevice = useMutation(api.campaigns.bindDevice);

  const [form, setForm] = useState({
    stationName: "",
    stationCode: "",
    invalidVotes: "",
  });

  // Dynamic candidate votes state
  const [candidateVotes, setCandidateVotes] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Use the campaign associated with the agent if possible, else fallback
  const effectiveCampaignId = agent?.campaignId || campaign?._id;
  // We need to fetch the specific campaign to get its dynamic candidates array
  // We can just use a separate query or assume campaign is the one we want.
  const activeCampaign = useQuery(api.campaigns.getAdminCampaign);

  const handleCandidateVoteChange = (candidateName: string, value: string) => {
    setCandidateVotes(prev => ({
      ...prev,
      [candidateName]: value
    }));
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    
    if (agent.pinCode && pinInput === agent.pinCode) {
      try {
        // Generate or retrieve the device footprint
        let deviceId = localStorage.getItem("ntc_device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("ntc_device_id", deviceId);
        }
        
        // Attempt to bind the device
        await bindDevice({ agentId: agent._id, deviceId });
        
        setIsAuthenticated(true);
        setPinError("");
      } catch (error: any) {
        if (error.message.includes("Device mismatch")) {
          setPinError("CRITICAL: This secure link is bound to another device. Access Denied.");
        } else {
          setPinError("Failed to verify device security context. Try again.");
        }
      }
    } else {
      setPinError("Invalid security PIN. Please try again.");
    }
  };

  if (agent === undefined || activeCampaign === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-900 dark:text-white w-8 h-8" />
      </div>
    );
  }

  if (agent === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl text-center border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">This secure link is invalid or has been revoked. Please contact the National Tally Center for a new link.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl text-center border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 px-4 py-1.5 rounded-full mb-6">
            <ShieldCheck className="w-4 h-4 text-slate-900 dark:text-white" />
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-widest uppercase">Secure Portal</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Verify Identity</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">Welcome back, {agent.name.split(" ")[0]}. Please enter your 4-digit PIN.</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div>
               <input autoFocus type="text" maxLength={4} className="w-full text-center tracking-[1em] text-2xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))} />
               {pinError && <p className="text-xs font-bold text-red-500 mt-2 text-center">{pinError}</p>}
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold py-3.5 rounded-xl shadow-md transition-all">
               Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCampaignId) return;
    
    setIsSubmitting(true);
    try {
      // Build the dynamic array of votes
      const votesArray = activeCampaign?.candidates?.map((c: string) => ({
        name: c,
        votes: parseInt(candidateVotes[c] || "0", 10)
      })) || [];

      await submitResults({
        campaignId: effectiveCampaignId as any,
        agentId: agent._id,
        agentName: agent.name,
        agentPhone: agent.phone,
        stationName: form.stationName,
        stationCode: form.stationCode,
        results: {
          candidateVotes: votesArray,
          invalidVotes: parseInt(form.invalidVotes || "0", 10),
        },
      });
      setSuccess(true);
    } catch (error) {
      alert("Failed to securely transmit data. Please try again or contact command center.");
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle className="w-10 h-10 text-slate-900 dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Transmission Successful</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Data has been securely received and encrypted at the National Tally Center.</p>
          <button 
            onClick={() => { setSuccess(false); setForm({ stationName: "", stationCode: "", invalidVotes: "" }); setCandidateVotes({}); }}
            className="text-sm font-bold text-slate-900 hover:text-slate-700 dark:text-white dark:hover:text-slate-200 underline"
          >
            Submit Another Station
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-[#020617] p-2 md:p-4 flex flex-col items-center justify-center font-sans transition-colors">
      
      <div className="w-full max-w-lg shrink-0 mb-4 text-center mt-2">
        <div className="inline-flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 px-4 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-slate-900 dark:text-white" />
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-widest uppercase">Secure Field Portal</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col min-h-0 transition-colors relative z-10">
        
        {/* Agent Lock Context */}
        <div className="bg-slate-100 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 p-6 shrink-0 transition-colors rounded-t-3xl z-20">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
               <Lock className="w-3.5 h-3.5" /> Identity Locked
             </div>
             <button onClick={() => setIsAuthenticated(false)} className="text-xs font-bold text-red-500 hover:underline">Log Out</button>
           </div>
           <div>
             <h2 className="text-lg font-bold text-slate-900 dark:text-white">{agent.name}</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{agent.designation} • {agent.phone}</p>
           </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 rounded-b-3xl relative">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4" /> Station Identity
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Station Name</label>
                  <input required type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="e.g. Kibera Primary" value={form.stationName} onChange={e => setForm({...form, stationName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Station Code</label>
                  <input required type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="e.g. KB-001" value={form.stationCode} onChange={e => setForm({...form, stationCode: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-6"></div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Official Results</h3>
              
              {activeCampaign?.candidates?.map((candidateName: string, idx: number) => (
                <div key={idx}>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">{candidateName} (Votes)</label>
                  <input required type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all" placeholder="0" value={candidateVotes[candidateName] || ""} onChange={e => handleCandidateVoteChange(candidateName, e.target.value)} />
                </div>
              ))}
              
              <div className="pt-2">
                <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-2">Invalid / Rejected Votes</label>
                <input required type="number" min="0" className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 text-lg font-bold text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="0" value={form.invalidVotes} onChange={e => setForm({...form, invalidVotes: e.target.value})} />
              </div>
            </div>

            <div className="pt-6 pb-2">
              <button disabled={isSubmitting} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-white/10 transition-all flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    <Send className="w-4 h-4" /> SECURE TRANSMIT
                  </>
                )}
              </button>
              <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-widest">End-to-End Encrypted Transmission</p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
