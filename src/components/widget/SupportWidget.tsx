"use client";

import React, { useState, useRef } from "react";
import html2canvas from "html2canvas-pro";
import { MessageSquare, Bug, X, Send, Camera, Upload, ChevronRight } from "lucide-react";
import { useSession } from "../providers/SessionProvider";
import { IssueType, ChatMessage, AITriageResult } from "@/types/feedback";

export default function SupportWidget() {
  const { user } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat");

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi ${user.name.split(" ")[0]}! I'm the Dumroo AI Support Assistant. How can I help you today?`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  // Report State
  const [issueType, setIssueType] = useState<IssueType>("General Feedback");
  const [comment, setComment] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Chat Functions ---
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { role: "user", content: chatInput };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userContext: {
            name: user.name,
            email: user.email,
            role: user.role,
            schoolName: user.schoolName,
          },
        }),
      });
      const data = await res.json();

      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
          canEscalateToTicket: data.canEscalateToTicket,
          suggestedComment: data.suggestedComment,
        },
      ]);
    } catch (err) {
      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, I lost connection. You can report an issue directly in the Report tab.",
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleEscalate = (suggestedComment?: string) => {
    setComment(suggestedComment || "");
    setIssueType("Data Discrepancy");
    setActiveTab("report");
  };

  // --- Screenshot Functions ---
  const captureScreen = async () => {
    // Hide the widget modal for 100ms before snapping so it isn't in the screenshot!
    setIsOpen(false);
    setIsCapturing(true);

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          scale: 1,
          ignoreElements: (el) => el.id === "dumroo-support-widget",
        });
        const base64Image = canvas.toDataURL("image/png");
        setScreenshotPreview(base64Image);
      } catch (err) {
        console.error("Screenshot failed", err);
        alert("Could not capture screen automatically. Please use the Upload button.");
      } finally {
        setIsOpen(true);
        setIsCapturing(false);
      }
    }, 150);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Submit Report Function ---
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          issueType,
          comment,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
          screenshotBase64: screenshotPreview,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitSuccess(false);
          setComment("");
          setScreenshotPreview(null);
        }, 3000);
      }
    } catch (err) {
      alert("Failed to send report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---
  return (
    <div id="dumroo-support-widget" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* The Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center transition-transform hover:scale-105"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* The Widget Modal */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-4 w-96 rounded-xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: "600px", height: "80vh" }}>
          
          {/* Header & Tabs */}
          <div className="bg-slate-50 border-b flex p-2 gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === "chat" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:bg-slate-100"}`}
            >
              <MessageSquare size={16} /> AI Support
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === "report" ? "bg-white shadow-sm text-red-600" : "text-gray-500 hover:bg-slate-100"}`}
            >
              <Bug size={16} /> Report Issue
            </button>
          </div>

          {/* TAB 1: AI Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {msg.content}
                    </div>
                    {msg.canEscalateToTicket && (
                      <button
                        onClick={() => handleEscalate(msg.suggestedComment)}
                        className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1 hover:underline bg-red-50 py-1 px-3 rounded-full border border-red-100"
                      >
                        Convert to Bug Report <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-slate-50 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Ask a question..."
                  className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={sendChatMessage} disabled={isChatting} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Report Issue */}
          {activeTab === "report" && (
            <div className="flex-1 overflow-y-auto p-5 bg-white">
              {submitSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <MessageSquare size={32} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">Report Sent!</h3>
                  <p className="text-sm text-slate-500">Thank you. The engineering team has been notified via Microsoft Teams.</p>
                </div>
              ) : (
                <form onSubmit={submitFeedback} className="space-y-4">
                  {/* Auto-Captured Details UI */}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Reporting as: {user.name}</p>
                      <p>{user.email} • {user.role}</p>
                    </div>
                  </div>

                  {/* Screenshot Section */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Screenshot (Optional)</label>
                    {screenshotPreview ? (
                      <div className="relative">
                        <img src={screenshotPreview} alt="Preview" className="w-full h-32 object-cover rounded-md border" />
                        <button type="button" onClick={() => setScreenshotPreview(null)} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={captureScreen} disabled={isCapturing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded text-sm font-medium flex justify-center items-center gap-2 border">
                          <Camera size={16} /> {isCapturing ? "Snapping..." : "Capture Screen"}
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded text-sm font-medium flex justify-center items-center gap-2 border">
                          <Upload size={16} /> Upload Image
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                      </div>
                    )}
                  </div>

                  {/* Issue Details */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue Category</label>
                    <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)} className="w-full border p-2 rounded text-sm focus:outline-none focus:border-blue-500 bg-white">
                      <option value="General Feedback">General Feedback</option>
                      <option value="Data Discrepancy">Data Discrepancy / Error</option>
                      <option value="UI / Visual Bug">UI / Visual Bug</option>
                      <option value="Feature Request">Feature Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Please describe the issue..."
                      className="w-full border p-3 rounded text-sm h-28 resize-none focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-medium py-3 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
                    {isSubmitting ? "Sending Report..." : "Submit Report"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}