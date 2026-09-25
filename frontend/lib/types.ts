export type Role = "student" | "mentor" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarSeed: string;
  role: Role;
}

export interface MentorProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  gradYear: number;
  domains: string[];
  bio: string;
  capacity: 1 | 2;
  activeMentees: number;
  matchScore?: number;
  availableSlots: string[]; // ISO weekday+time strings, display only
  ratingAvg: number; // 1-5
  bankVerified: boolean;
}

export interface MilestoneModule {
  week: number;
  title: string;
  objectives: string[];
  status: "completed" | "active" | "locked";
  resources: { name: string; sizeKb: number; r2Key: string }[];
  assignment?: {
    prompt: string;
    submitted: boolean;
    submittedFileName?: string;
    grade?: number; // 0-100
    feedback?: string;
  };
  sessionMinutes?: number; // minutes logged in live consultation for this week
}

export interface MentorshipCycle {
  id: string;
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  domain: string;
  startedOn: string;
  currentWeek: number;
  totalWeeks: 12;
  modules: MilestoneModule[];
  studentRatingOfMentor?: number; // 1-5
  lastSessionOn?: string;
  meetingsLast10Days: number;
}

export interface MentorRequest {
  id: string;
  studentId: string;
  studentName: string;
  careerGoal: string;
  matchScore: number;
  domain: string;
  requestedOn: string;
  status: "pending" | "accepted" | "declined";
}

export interface PayoutEntry {
  id: string;
  cycleId: string;
  mentorId: string;
  studentName: string;
  week: number;
  amount: number;
  status: "Held - Pending Grade" | "Held - Session Incomplete" | "Approved" | "Disbursed";
  gradeSubmitted: boolean;
  sessionMinutes: number;
  verifiedPayoutMethod: boolean;
}

export interface AccreditationCandidate {
  id: string;
  name: string;
  email: string;
  claimedTitle: string;
  claimedCompany: string;
  gradYear: number;
  degreeDoc: string;
  employmentDoc: string;
  submittedOn: string;
  status: "pending" | "approved" | "rejected";
}

export interface DisputeAlert {
  id: string;
  cycleId: string;
  studentName: string;
  mentorName: string;
  meetingsLast10Days: number;
  currentWeek: number;
  flaggedOn: string;
  status: "open" | "resolved";
}

export interface AdminPairRow {
  cycleId: string;
  studentName: string;
  mentorName: string;
  mentorCapacityLoad: string; // "2/2"
  currentWeek: number;
  avgAssignmentGrade: number | null;
  studentRatingOfMentor: number | null;
  lastSessionOn: string | null;
  attendanceLog: { date: string; durationMinutes: number }[];
}
