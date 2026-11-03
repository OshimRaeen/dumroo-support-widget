export type UserRole = "Teacher" | "Student" | "District Admin";

export type IssueType = "Data Discrepancy" | "UI / Visual Bug" | "Feature Request" | "General Feedback";

export type AISeverity = "High" | "Medium" | "Low";

export interface DemoUserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolName: string;
  avatarInitials: string;
}

export interface AITriageResult {
  summary: string;
  category: string;
  severity: AISeverity;
  suggestedFix: string;
}

export interface FeedbackTicket {
  id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  issue_type: IssueType;
  comment: string;
  page_url: string | null;
  user_agent: string | null;
  screenshot_url: string | null;
  ai_summary: string | null;
  ai_category: string | null;
  ai_severity: AISeverity | null;
  ai_suggested_fix: string | null;
  teams_sent: boolean;
  created_at: string;
}

export interface SubmitFeedbackPayload {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  issueType: IssueType;
  comment: string;
  pageUrl: string;
  userAgent: string;
  screenshotBase64?: string | null;
  customWebhookUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  canEscalateToTicket?: boolean;
  suggestedComment?: string;
}