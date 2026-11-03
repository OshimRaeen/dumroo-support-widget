import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";
import {
  AISeverity,
  AITriageResult,
  SubmitFeedbackPayload,
} from "@/types/feedback";

const groqApiKey = process.env.GROQ_API_KEY || "";
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

// 1. Helper: Upload optional Base64 screenshot to Supabase Storage
async function uploadScreenshotToSupabase(
  base64DataUrl: string
): Promise<string | null> {
  if (!supabase || !base64DataUrl.startsWith("data:image/")) {
    return null;
  }

  try {
    const matches = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Payload = matches[2];
    const extension = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(base64Payload, "base64");

    const fileName = `ticket-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Supabase Storage Upload Error]:", uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error("[Screenshot Upload Exception]:", err);
    return null;
  }
}

// 2. Helper: Run Groq AI Triage on the user's feedback
async function runGroqTriage(
  payload: SubmitFeedbackPayload
): Promise<AITriageResult> {
  const fallbackTriage: AITriageResult = {
    summary: payload.comment.slice(0, 110),
    category: payload.issueType,
    severity: payload.issueType === "Data Discrepancy" ? "High" : "Medium",
    suggestedFix:
      "Inspect component state and verify API payload mapping for the reported route.",
  };

  if (!groq) {
    return fallbackTriage;
  }

  try {
    const prompt = `You are a Senior Engineering Triage Assistant for Dumroo.ai (an AI EdTech platform).
Analyze this incoming user bug report / feedback and return ONLY a valid JSON object with these exact keys:
- "summary": A crisp 1-sentence technical summary (max 18 words).
- "category": One of ["Data Integrity", "UI / Layout", "Performance", "Feature Request", "General UX"].
- "severity": One of ["High", "Medium", "Low"]. (Mark data discrepancies, broken grading/attendance, or crashes as "High").
- "suggestedFix": A concrete 1-sentence engineering investigation step or fix.

User Report Details:
- Role: ${payload.userRole}
- Selected Issue Type: ${payload.issueType}
- Page URL: ${payload.pageUrl}
- Screenshot Attached: ${payload.screenshotBase64 ? "Yes" : "No (Text-Only Report)"}
- User Comment: "${payload.comment}"`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Partial<AITriageResult>;

    const validSeverities: AISeverity[] = ["High", "Medium", "Low"];
    const severity: AISeverity = validSeverities.includes(
      parsed.severity as AISeverity
    )
      ? (parsed.severity as AISeverity)
      : fallbackTriage.severity;

    return {
      summary: parsed.summary || fallbackTriage.summary,
      category: parsed.category || fallbackTriage.category,
      severity,
      suggestedFix: parsed.suggestedFix || fallbackTriage.suggestedFix,
    };
  } catch (err) {
    console.error("[Groq Triage Error]:", err);
    return fallbackTriage;
  }
}

// 3. Helper: Build & Send Microsoft Teams Adaptive Card via Webhook
function buildTeamsAdaptiveCard(
  payload: SubmitFeedbackPayload,
  triage: AITriageResult,
  screenshotUrl: string | null
) {
  const severityColor =
    triage.severity === "High"
      ? "Attention"
      : triage.severity === "Medium"
      ? "Warning"
      : "Good";

  const cardBody: Record<string, unknown>[] = [
    {
      type: "TextBlock",
      text: `🚨 New Dumroo.ai Feedback: ${triage.summary}`,
      weight: "Bolder",
      size: "Large",
      wrap: true,
    },
    {
      type: "FactSet",
      facts: [
        {
          title: "Reported By:",
          value: `${payload.userName} (${payload.userEmail})`,
        },
        { title: "Account Role:", value: payload.userRole },
        { title: "Issue Type:", value: payload.issueType },
        {
          title: "AI Triage:",
          value: `${triage.category} | Severity: ${triage.severity}`,
        },
        {
          title: "Screenshot:",
          value: screenshotUrl
            ? "Attached below"
            : "Skipped by user (Text-only report)",
        },
        { title: "Page Route:", value: payload.pageUrl },
      ],
    },
    {
      type: "TextBlock",
      text: "**User Comment:**",
      weight: "Bolder",
      spacing: "Medium",
    },
    {
      type: "TextBlock",
      text: payload.comment,
      wrap: true,
      isSubtle: true,
    },
    {
      type: "TextBlock",
      text: `🤖 **Groq AI Suggested Engineering Action (${triage.severity} Priority):** ${triage.suggestedFix}`,
      wrap: true,
      color: severityColor,
      spacing: "Medium",
    },
  ];

  if (screenshotUrl) {
    cardBody.push({
      type: "Image",
      url: screenshotUrl,
      altText: "User captured issue screenshot",
      size: "Stretch",
    });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: cardBody,
        },
      },
    ],
  };
}

// GET /api/feedback -> Fetch recent tickets from Supabase
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ tickets: [], configured: false });
  }

  const { data, error } = await supabase
    .from("feedback_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[GET /api/feedback Supabase Error]:", error.message);
    return NextResponse.json(
      { tickets: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ tickets: data || [], configured: true });
}

// POST /api/feedback -> Upload Screenshot + Groq Triage + Teams Webhook + Save to Supabase
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SubmitFeedbackPayload;

    if (!payload.userEmail || !payload.comment?.trim()) {
      return NextResponse.json(
        { error: "User email and feedback comment are required." },
        { status: 400 }
      );
    }

    // Run screenshot upload and Groq AI triage in parallel for lower latency!
    const [screenshotUrl, triage] = await Promise.all([
      payload.screenshotBase64
        ? uploadScreenshotToSupabase(payload.screenshotBase64)
        : Promise.resolve(null),
      runGroqTriage(payload),
    ]);

    const adaptiveCardPayload = buildTeamsAdaptiveCard(
      payload,
      triage,
      screenshotUrl
    );

    // Dual-Mode Webhook: Use reviewer's custom webhook if provided, otherwise .env TEAMS_WEBHOOK_URL
    const targetWebhookUrl =
      payload.customWebhookUrl?.trim() ||
      process.env.TEAMS_WEBHOOK_URL?.trim() ||
      "";

    let teamsSent = false;
    let teamsStatusNote = "No Teams Webhook URL configured yet (Preview generated)";

    if (targetWebhookUrl && targetWebhookUrl.startsWith("https://")) {
      try {
        const teamsRes = await fetch(targetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adaptiveCardPayload),
        });
        teamsSent = teamsRes.ok;
        teamsStatusNote = teamsRes.ok
          ? "Delivered to Microsoft Teams channel (200 OK)"
          : `Teams Webhook returned HTTP ${teamsRes.status}`;
      } catch (webhookErr) {
        console.error("[Teams Webhook Dispatch Error]:", webhookErr);
        teamsStatusNote = "Failed to reach Microsoft Teams Webhook URL";
      }
    }

    // Persist ticket in Supabase
    let savedTicket = null;
    if (supabase) {
      const { data, error } = await supabase
        .from("feedback_tickets")
        .insert([
          {
            user_name: payload.userName || "Anonymous User",
            user_email: payload.userEmail,
            user_role: payload.userRole || "Teacher",
            issue_type: payload.issueType || "General Feedback",
            comment: payload.comment.trim(),
            page_url: payload.pageUrl || "/",
            user_agent: payload.userAgent || "Browser",
            screenshot_url: screenshotUrl,
            ai_summary: triage.summary,
            ai_category: triage.category,
            ai_severity: triage.severity,
            ai_suggested_fix: triage.suggestedFix,
            teams_sent: teamsSent,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("[Supabase Insert Error]:", error.message);
      } else {
        savedTicket = data;
      }
    }

    return NextResponse.json({
      success: true,
      ticket: savedTicket,
      triage,
      screenshotUrl,
      teamsSent,
      teamsStatusNote,
      adaptiveCardPayload,
    });
  } catch (error) {
    console.error("[POST /api/feedback Error]:", error);
    return NextResponse.json(
      { error: "Failed to process feedback submission." },
      { status: 500 }
    );
  }
}