import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groqApiKey = process.env.GROQ_API_KEY || "";
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

interface IncomingChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: IncomingChatMessage[];
  userContext?: {
    name: string;
    email: string;
    role: string;
    schoolName: string;
  };
}

interface GroqSupportResponse {
  reply: string;
  canEscalateToTicket: boolean;
  suggestedComment: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, userContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    // Fallback if GROQ_API_KEY is missing
    if (!groq) {
      return NextResponse.json({
        reply:
          "I see you're experiencing an issue on the dashboard. Would you like to forward this directly to our engineering team on Microsoft Teams?",
        canEscalateToTicket: true,
        suggestedComment: messages[messages.length - 1]?.content || "",
      });
    }

    const recentMessages = messages.slice(-8);

//     const systemPrompt = `You are the Dumroo.ai In-App Support Assistant helping an authenticated user (${
//       userContext?.name || "User"
//     }, Role: ${userContext?.role || "Teacher"}, School: ${
//       userContext?.schoolName || "Lincoln High"
//     }).
// Dumroo.ai is an AI EdTech platform featuring Classroom Analytics, Automated Grading, Attendance Tracking, and IEP Student Support.

// Your job:
// 1. Answer the user's question concisely, warmly, and naturally in 2-3 sentences.
// 2. Detect if the user is reporting a bug, incorrect data (like attendance over 100% or grade mismatches), a broken button, or a feature request.
// 3. Return ONLY a valid JSON object matching this exact schema:
// {
//   "reply": "Your helpful 2-3 sentence response to the user.",
//   "canEscalateToTicket": true or false (true if they mention a bug, data error, glitch, or feature request),
//   "suggestedComment": "A clean, first-person 1-2 sentence bug/feedback description that pre-fills the engineering report form if they escalate."
// }`;

    const systemPrompt = `You are the Dumroo.ai In-App Support Assistant helping an authenticated user (${
      userContext?.name || "User"
    }, Role: ${userContext?.role || "Teacher"}, School: ${
      userContext?.schoolName || "Lincoln High"
    }).

    Your job:
    1. Answer the user's question concisely in 2-3 sentences.
    2. Detect if the user is reporting a bug, incorrect data, or a feature request.

    CRITICAL INSTRUCTION: You MUST format your entire response as a valid JSON object. Do not output any markdown formatting, code blocks, or conversational text outside of the JSON structure. 

    Output EXACTLY this JSON schema and nothing else:
    {
      "reply": "Your helpful 2-3 sentence response here.",
      "canEscalateToTicket": true,
      "suggestedComment": "A clean 1-2 sentence bug description."
    }`;
    
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent) as Partial<GroqSupportResponse>;

    return NextResponse.json({
      reply:
        parsed.reply ||
        "Thanks for flagging that! You can send this directly to our engineering team using the Report Issue tab.",
      canEscalateToTicket: Boolean(parsed.canEscalateToTicket),
      suggestedComment:
        parsed.suggestedComment ||
        recentMessages[recentMessages.length - 1]?.content ||
        "",
    });
  } catch (error) {
    console.error("[POST /api/chat] Error:", error);
    return NextResponse.json(
      {
        reply:
          "I ran into a temporary connection hiccup, but you can still submit a bug report directly to our Microsoft Teams channel using the Report Issue tab.",
        canEscalateToTicket: true,
        suggestedComment: "",
      },
      { status: 200 }
    );
  }
}