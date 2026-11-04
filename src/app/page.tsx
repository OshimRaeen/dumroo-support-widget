"use client";

import React, { useState, useEffect } from "react";
import SupportWidget from "@/components/widget/SupportWidget";
import { useSession } from "@/components/providers/SessionProvider";
import { Settings, Users, BarChart3, AlertTriangle, Server, CheckCircle2 } from "lucide-react";
import { FeedbackTicket } from "@/types/feedback";

export default function DashboardPage() {
  const { user, switchUser } = useSession();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);

  useEffect(() => {
    const savedWebhook = localStorage.getItem("dumroo_custom_webhook");
    if (savedWebhook) setWebhookUrl(savedWebhook);
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error("Failed to fetch tickets");
    }
  };

  const saveWebhook = () => {
    localStorage.setItem("dumroo_custom_webhook", webhookUrl);
    alert("Reviewer Webhook Saved! Feedback will now route to your MS Teams channel.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* --- REVIEWER TEST MODE BAR --- */}
      <div className="bg-slate-900 text-slate-200 text-sm px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between shadow-md relative z-10 gap-3 sm:gap-0 text-center sm:text-left">
        <div className="flex items-center gap-2 font-medium text-blue-400">
          <Settings size={16} /> Reviewer Test Mode
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <span className="text-slate-400 text-xs sm:text-sm">Test with your own Dumroo MS Teams Webhook:</span>
          <div className="flex w-full sm:w-auto gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://YOUR_WEBHOOK_URL..."
              className="w-full sm:w-72 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            />
            <button onClick={saveWebhook} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded font-medium transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>

      {/* --- EDTECH NAVBAR --- */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">D</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dumroo.ai</h1>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:inline">Auto-Capture Demo Role:</span>
          <select 
            value={user.role} 
            onChange={(e) => switchUser(e.target.value as any)}
            className="border-slate-200 bg-slate-50 text-slate-700 rounded-md text-xs sm:text-sm py-1.5 px-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium flex-1 sm:flex-none"
          >
            <option value="Teacher">Teacher (Sarah Jenkins)</option>
            <option value="Student">Student (Alex Rivera)</option>
            <option value="District Admin">District Admin (Dr. Vance)</option>
          </select>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200 flex-shrink-0">
            {user.avatarInitials}
          </div>
        </div>
      </header>

      {/* --- DASHBOARD CONTENT --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-20 sm:mb-0">
        
        {/* Left Column: Fake EdTech UI */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Classroom Analytics
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Average Grade</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-800">B+</p>
            </div>
            
            <div className="bg-red-50 p-5 sm:p-6 rounded-xl border border-red-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                <AlertTriangle size={12} /> Data Error Demo
              </div>
              <p className="text-xs sm:text-sm font-medium text-red-600 uppercase tracking-wider mb-1">Student Attendance</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-800">108% <span className="text-base sm:text-lg text-slate-500 font-normal line-through">100%</span></p>
              <p className="text-[10px] sm:text-xs text-red-500 mt-2 font-medium group-hover:underline cursor-help">
                *Alex Rivera is showing impossible attendance. Use the support widget to report this!
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Users size={18} /> Student Roster</h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left text-slate-500 min-w-[400px]">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-4 sm:px-6 py-3">Student Name</th>
                   <th className="px-4 sm:px-6 py-3">Current Grade</th>
                   <th className="px-4 sm:px-6 py-3">Status</th>
                 </tr>
                </thead>
             <tbody>
            <tr className="bg-white border-b border-slate-100">
            <td className="px-4 sm:px-6 py-3 font-medium text-slate-900">Alex Rivera</td>
           <td className="px-4 sm:px-6 py-3">B+</td>
           <td className="px-4 sm:px-6 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Active</span></td>
           </tr>
           <tr className="bg-white border-b border-slate-100">
            <td className="px-4 sm:px-6 py-3 font-medium text-slate-900">Maya Lin</td>
            <td className="px-4 sm:px-6 py-3">A</td>
           <td className="px-4 sm:px-6 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Active</span></td>
          </tr>
          <tr className="bg-white">
            <td className="px-4 sm:px-6 py-3 font-medium text-slate-900">Jordan Smith</td>
            <td className="px-4 sm:px-6 py-3">C-</td>
            <td className="px-4 sm:px-6 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase">At Risk</span></td>
         </tr>
         </tbody>
       </table>
           </div>
          </div>
        </div>

        {/* Right Column: Live Tickets Feed */}
        <div className="col-span-1 lg:col-span-5 flex flex-col h-full">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Server size={18} /> Live Supabase & Teams Log</h3>
              <button onClick={fetchTickets} className="text-xs font-medium text-blue-600 hover:underline">Refresh Feed</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[400px] lg:max-h-[600px]">
              {tickets.length === 0 ? (
                <div className="text-center text-slate-400 py-10 text-xs sm:text-sm">
                  No feedback tickets yet.<br/>Submit one to see the Groq AI Triage and MS Teams webhook in action!
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="border border-slate-100 rounded-lg p-3 sm:p-4 bg-slate-50 relative">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="font-semibold text-xs sm:text-sm text-slate-800 break-words">{ticket.user_name} <span className="text-slate-400 font-normal">({ticket.user_role})</span></div>
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-blue-100 text-blue-700 uppercase tracking-wide flex-shrink-0">
                        {ticket.ai_category}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 italic mb-3">"{ticket.comment}"</p>
                    
                   <div className="bg-slate-50 p-2 sm:p-3 rounded border border-slate-200 text-[11px] sm:text-xs mb-3 space-y-1 text-slate-800">
                  <div className="font-semibold flex flex-wrap items-center justify-between text-slate-900 mb-1 gap-2">
                  <span>🤖 Groq Triage</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] uppercase font-bold ${
                 ticket.ai_severity === 'High' ? 'bg-red-100 text-red-700' : ticket.ai_severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>{ticket.ai_severity} Priority</span>
                </div>
                <p><span className="font-semibold text-slate-900">Summary:</span> {ticket.ai_summary}</p>
                <p><span className="font-semibold text-slate-900">Action:</span> {ticket.ai_suggested_fix}</p>
                </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] font-medium mt-2 pt-3 border-t border-slate-200 gap-2 sm:gap-0">
                      <div className="flex items-center gap-1 text-slate-500">
                        {ticket.screenshot_url ? <span className="text-blue-600">🖼️ Image Attached</span> : "No Screenshot"}
                      </div>
                      <div className={`flex items-center gap-1 ${ticket.teams_sent ? "text-emerald-600" : "text-amber-600"}`}>
                        {ticket.teams_sent ? <CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5" /> : <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" />} 
                        {ticket.teams_sent ? "Teams Webhook Delivered" : "Teams Webhook Pending"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <SupportWidget />
    </div>
  );
}