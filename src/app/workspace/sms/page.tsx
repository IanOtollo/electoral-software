"use client";

import React, { useState, useRef } from "react";
import { MessageSquare, Send, Users, UploadCloud, FileSpreadsheet, Plus, Loader2, CheckCircle, Smartphone, Search, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Tesseract from "tesseract.js";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function SMSDashboard() {
  const campaign = useQuery(api.campaigns.getAdminCampaign);
  const contacts = useQuery(api.sms.getContacts, { campaignId: campaign?._id });
  const smsCampaigns = useQuery(api.sms.getSmsCampaigns, { campaignId: campaign?._id });
  const smsLogs = useQuery(api.sms.getSmsLogs, { campaignId: campaign?._id });
  
  const addContacts = useMutation(api.sms.addContacts);
  const sendSmsCampaign = useMutation(api.sms.sendSmsCampaign);

  const [activeTab, setActiveTab] = useState<'contacts' | 'campaigns' | 'logs'>('contacts');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState({ name: "", phone: "", group: "Manual Entry" });
  const [searchQuery, setSearchQuery] = useState("");

  const [campaignMessage, setCampaignMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState("All Contacts");
  const [isSending, setIsSending] = useState(false);

  const groups = Array.from(new Set(contacts?.map(c => c.group) || []));

  const filteredContacts = contacts?.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.phone.includes(searchQuery)
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaign) return;

    setIsUploading(true);
    setUploadSuccess(null);

    try {
      const groupName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      let extractedText = "";
      const newContacts: { name: string; phone: string; group: string }[] = [];

      // Determine file type
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType.includes("image") || fileName.match(/\.(jpg|jpeg|png)$/)) {
        // IMAGE OCR
        setUploadSuccess("Analyzing image text (this may take a few seconds)...");
        const result = await Tesseract.recognize(file, 'eng');
        extractedText = result.data.text;
      } else if (fileType.includes("text") || fileName.match(/\.(txt|csv)$/)) {
        // RAW TEXT / CSV
        extractedText = await file.text();
      } else if (fileName.match(/\.(xlsx|xls)$/)) {
        // EXCEL
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[][]>(firstSheet, { header: 1 });
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !Array.isArray(row)) continue;
          let foundPhone = "";
          let foundName = "";
          for (let j = 0; j < row.length; j++) {
            const cellStr = String(row[j] || "").trim();
            const digitsOnly = cellStr.replace(/\D/g, "");
            if (digitsOnly.length >= 9 && digitsOnly.length <= 15) {
              foundPhone = digitsOnly;
              const possibleName1 = String(row[j-1] || "").trim();
              const possibleName2 = String(row[j+1] || "").trim();
              if (possibleName1 && isNaN(Number(possibleName1))) foundName = possibleName1;
              else if (possibleName2 && isNaN(Number(possibleName2))) foundName = possibleName2;
              break;
            }
          }
          if (foundPhone) {
            newContacts.push({ name: foundName || "Voter", phone: foundPhone, group: groupName });
          }
        }
      } else {
        throw new Error("Unsupported file format");
      }

      // Universal Text Scraper (for OCR and TXT files)
      if (extractedText) {
        // Split by lines
        const lines = extractedText.split('\n');
        for (const line of lines) {
          // Look for 9-15 digit sequences
          const phoneMatch = line.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/);
          if (phoneMatch) {
            const rawPhone = phoneMatch[0];
            const digitsOnly = rawPhone.replace(/\D/g, "");
            if (digitsOnly.length >= 9 && digitsOnly.length <= 15) {
              // Try to grab alphabetical words near it as the name
              const withoutPhone = line.replace(rawPhone, "").trim();
              const nameMatch = withoutPhone.match(/[a-zA-Z\s]{3,25}/);
              const foundName = nameMatch ? nameMatch[0].trim() : "Voter";
              
              newContacts.push({
                name: foundName,
                phone: digitsOnly,
                group: groupName
              });
            }
          }
        }
      }

      if (newContacts.length > 0) {
        const addedCount = await addContacts({
          campaignId: campaign._id,
          contacts: newContacts
        });
        setUploadSuccess(`Successfully scraped and imported ${addedCount} contacts from ${file.name}`);
      } else {
        alert("No valid phone numbers found in the document.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse the file. Please ensure it's a valid format.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    setIsUploading(true);
    try {
      await addContacts({
        campaignId: campaign._id,
        contacts: [manualForm]
      });
      setManualForm({ name: "", phone: "", group: "Manual Entry" });
      setUploadSuccess("Contact added manually!");
    } catch (err) {
      console.error(err);
      alert("Failed to add contact");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadSuccess(null), 3000);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !campaignMessage.trim()) return;
    setIsSending(true);
    try {
      const result = await sendSmsCampaign({
        campaignId: campaign._id,
        message: campaignMessage,
        targetGroup: targetGroup,
      });
      alert(`Broadcast sent to ${result.count} contacts!`);
      setCampaignMessage("");
      setActiveTab('logs');
    } catch (err) {
      console.error(err);
      alert("Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full flex flex-col py-6 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
          <Send className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Voter Outreach</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage contacts and broadcast SMS campaigns.</p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-6 w-full mb-8 md:mb-10">
        <div 
          onClick={() => setActiveTab('contacts')}
          className={`bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border-2 ${activeTab === 'contacts' ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm opacity-60'} flex flex-col items-center text-center cursor-pointer transition-all hover:scale-105`}
        >
          <Users className={`w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-4 ${activeTab === 'contacts' ? 'text-blue-500' : 'text-slate-400'}`} />
          <h3 className="font-bold text-[10px] md:text-base text-slate-900 dark:text-white md:mb-2">Contacts</h3>
          <p className="hidden md:block text-xs text-slate-500">Import and group your voter contacts.</p>
        </div>
        <div 
          onClick={() => setActiveTab('campaigns')}
          className={`bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border-2 ${activeTab === 'campaigns' ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm opacity-60'} flex flex-col items-center text-center cursor-pointer transition-all hover:scale-105`}
        >
          <MessageSquare className={`w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-4 ${activeTab === 'campaigns' ? 'text-blue-500' : 'text-slate-400'}`} />
          <h3 className="font-bold text-[10px] md:text-base text-slate-900 dark:text-white md:mb-2">Campaigns</h3>
          <p className="hidden md:block text-xs text-slate-500">Draft and schedule bulk messages.</p>
        </div>
        <div 
          onClick={() => setActiveTab('logs')}
          className={`bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border-2 ${activeTab === 'logs' ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm opacity-60'} flex flex-col items-center text-center cursor-pointer transition-all hover:scale-105`}
        >
          <Send className={`w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-4 ${activeTab === 'logs' ? 'text-blue-500' : 'text-slate-400'}`} />
          <h3 className="font-bold text-[10px] md:text-base text-slate-900 dark:text-white md:mb-2">Logs</h3>
          <p className="hidden md:block text-xs text-slate-500">Track delivery status in real-time.</p>
        </div>
      </div>

      {/* Contacts View */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload & Manual Entry */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Smart Excel Upload */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <FileSpreadsheet className="w-24 h-24 text-slate-100 dark:text-slate-800/50 -rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-blue-500" /> Smart Import
                </h3>
                <p className="text-xs text-slate-500 mb-6">Upload Excel spreadsheets or CSV files (e.g., polling station lists). We will automatically scrape names, numbers, and group them by filename.</p>
                
                <input 
                  type="file" 
                  accept="*/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-4 border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isUploading ? "Scraping Data..." : "Upload Any File (Excel, Text, Image)"}
                </button>
                
                {uploadSuccess && (
                  <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" /> {uploadSuccess}
                  </div>
                )}
              </div>
            </div>

            {/* Manual Entry */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manual Entry</h3>
               <form onSubmit={handleManualSubmit} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">Name</label>
                   <input required type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="e.g. Wanjiku Mutua" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">Phone Number</label>
                   <input required type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} placeholder="07XX..." />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">Group / Station / Ward / Constituency</label>
                   <input required type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={manualForm.group} onChange={e => setManualForm({...manualForm, group: e.target.value})} />
                 </div>
                 <button disabled={isUploading} type="submit" className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-3 rounded-lg font-bold text-sm shadow-md hover:opacity-90 transition-opacity">
                   Save Contact
                 </button>
               </form>
            </div>
          </div>

          {/* Right Column: Database List */}
          <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#0A0E17]/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Contact Database</h3>
                <p className="text-xs text-slate-500">Total: {contacts ? contacts.length : 0}</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search name or number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!contacts ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : filteredContacts?.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No contacts found.</p>
                  {searchQuery ? (
                    <p className="text-xs mt-1">Try a different search term.</p>
                  ) : (
                    <p className="text-xs mt-1">Upload a file or add manually to start.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredContacts?.map((contact) => (
                    <div key={contact._id} className="flex items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 shrink-0">
                        <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{contact.name}</h4>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{contact.phone}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 truncate max-w-full">
                          {contact.group}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns View */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Compose Broadcast</h3>
              <form onSubmit={handleSendCampaign} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Target Audience</label>
                  <select 
                    value={targetGroup}
                    onChange={e => setTargetGroup(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Contacts">All Contacts ({contacts?.length || 0})</option>
                    {groups.map(g => (
                      <option key={g} value={g}>{g} ({contacts?.filter(c => c.group === g).length})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Message</label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="Type your message here..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={campaignMessage}
                    onChange={e => setCampaignMessage(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-500">{campaignMessage.length} characters</span>
                    <span className="text-[10px] font-bold text-slate-500">{Math.max(1, Math.ceil(campaignMessage.length / 160))} SMS Page(s)</span>
                  </div>
                </div>
                <button disabled={isSending} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? "Sending..." : "Send Broadcast"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A0E17]/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Broadcast History</h3>
              <p className="text-xs text-slate-500">Past sent campaigns.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!smsCampaigns ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : smsCampaigns.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No broadcasts sent yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {smsCampaigns.map(camp => (
                    <div key={camp._id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                          Target: {camp.targetGroup}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{new Date(camp.sentAt || 0).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                        {camp.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeTab === 'logs' && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A0E17]/50">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delivery Logs</h3>
            <p className="text-xs text-slate-500">Real-time status of individual messages.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-bold">Recipient</th>
                  <th className="p-4 font-bold">Message Snippet</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!smsLogs ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
                ) : smsLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold">No delivery logs found.</td></tr>
                ) : (
                  smsLogs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{log.phone}</td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{log.message}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          log.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          log.status === 'Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {log.status === 'Delivered' && <CheckCircle className="w-3 h-3" />}
                          {log.status === 'Failed' && <AlertCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-bold">{new Date(log.sentAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
