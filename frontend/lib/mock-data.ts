import type {
  MentorProfile,
  MentorshipCycle,
  MilestoneModule,
  MentorRequest,
  PayoutEntry,
  AccreditationCandidate,
  DisputeAlert,
  AdminPairRow,
} from "./types";

// ---------------------------------------------------------------------------
// Session identity (mocked — no real auth backend)
// ---------------------------------------------------------------------------
export const CURRENT_USER = {
  student: { id: "stu-014", name: "Priya Raman" },
  mentor: { id: "men-003", name: "Devika Sharma" },
  admin: { id: "adm-001", name: "Registrar Office" },
};

export const DOMAINS = [
  "Product Management",
  "Data Science",
  "Software Engineering",
  "UX Research",
  "Investment Banking",
  "Public Policy",
  "Biotech R&D",
  "Climate & Energy",
];

// ---------------------------------------------------------------------------
// 12-week syllabus template — reused, mutated per cycle
// ---------------------------------------------------------------------------
const SYLLABUS_TEMPLATE: { title: string; objectives: string[] }[] = [
  { title: "Orientation & Goal Mapping", objectives: ["Define 12-week outcome statement", "Audit current skill gaps", "Agree on communication cadence"] },
  { title: "Domain Landscape Review", objectives: ["Map key players in target domain", "Identify 3 target companies or labs"] },
  { title: "Resume & Narrative Audit", objectives: ["Rewrite resume bullets around impact", "Draft personal narrative statement"] },
  { title: "Core Skill Sprint I", objectives: ["Complete diagnostic exercise", "Review with mentor annotations"] },
  { title: "Network Mapping", objectives: ["Identify 5 warm-intro targets", "Draft outreach templates"] },
  { title: "Mock Interview Round I", objectives: ["Behavioral round simulation", "Debrief and improvement plan"] },
  { title: "Core Skill Sprint II", objectives: ["Applied case study submission", "Peer benchmark comparison"] },
  { title: "Portfolio / Case Study Build", objectives: ["Draft one flagship artifact", "Mentor structural review"] },
  { title: "Mock Interview Round II", objectives: ["Technical or case round simulation", "Score against rubric"] },
  { title: "Offer Strategy & Negotiation", objectives: ["Model compensation scenarios", "Draft negotiation scripts"] },
  { title: "Capstone Review", objectives: ["Present full trajectory artifact", "Mentor sign-off checklist"] },
  { title: "Transition Planning", objectives: ["90-day post-program plan", "Alumni network handoff"] },
];

function buildModules(currentWeek: number, seed: number): MilestoneModule[] {
  return SYLLABUS_TEMPLATE.map((tpl, i) => {
    const week = i + 1;
    const status: MilestoneModule["status"] =
      week < currentWeek ? "completed" : week === currentWeek ? "active" : "locked";
    const hasAssignment = week % 2 === 1 || week === currentWeek;
    return {
      week,
      title: tpl.title,
      objectives: tpl.objectives,
      status,
      resources: [
        { name: `week-${week}-briefing.pdf`, sizeKb: 240 + ((seed + week) % 5) * 60, r2Key: `r2://alumnilink/syllabi/w${week}-${seed}.pdf` },
        { name: `week-${week}-worksheet.pdf`, sizeKb: 90 + ((seed + week) % 3) * 40, r2Key: `r2://alumnilink/worksheets/w${week}-${seed}.pdf` },
      ],
      assignment: hasAssignment
        ? {
            prompt: `Submit your ${tpl.title.toLowerCase()} deliverable as a single PDF for mentor review.`,
            submitted: status === "completed" || (status === "active" && (seed + week) % 4 === 0),
            submittedFileName: status === "completed" ? `w${week}-submission-${seed}.pdf` : undefined,
            grade: status === "completed" ? 72 + ((seed + week * 7) % 26) : undefined,
            feedback: status === "completed" ? "Solid structure — tighten the quantified impact statements next round." : undefined,
          }
        : undefined,
      sessionMinutes: status === "completed" ? 25 + ((seed + week) % 4) * 8 : status === "active" ? 0 : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Mentor directory (student-facing discovery feed)
// ---------------------------------------------------------------------------
const MENTOR_NAMES = [
  "Devika Sharma", "Arjun Mehta", "Wei Lin", "Sofia Alvarez", "Kwame Boateng",
  "Naomi Ito", "Daniel Kessler", "Fatima Noor", "Lucas Bergmann", "Aditi Rao",
  "Marcus Webb", "Elena Petrova",
];

export const MENTOR_DIRECTORY: MentorProfile[] = MENTOR_NAMES.map((name, i) => {
  const domain = DOMAINS[i % DOMAINS.length];
  const capacity: 1 | 2 = i % 3 === 0 ? 1 : 2;
  const activeMentees = Math.min(capacity, (i % 2) + (capacity === 2 ? 1 : 0));
  return {
    id: `men-${String(i + 1).padStart(3, "0")}`,
    name,
    title: ["Senior PM", "Staff Engineer", "Lead Data Scientist", "Principal Researcher", "VP Strategy", "Director"][i % 6],
    company: ["Meridian Health", "Northwind Labs", "Stratos Bank", "Cobalt Robotics", "Fieldnote", "Anvil Systems"][i % 6],
    gradYear: 2008 + (i % 14),
    domains: [domain, DOMAINS[(i + 3) % DOMAINS.length]],
    bio: `${name.split(" ")[0]} spent ${6 + (i % 10)} years scaling ${domain.toLowerCase()} functions and now mentors students moving into the field, with a focus on portfolio-building and interview readiness.`,
    capacity,
    activeMentees,
    matchScore: 68 + ((i * 7) % 31),
    availableSlots: i % 2 === 0 ? ["Tue 6:00 PM", "Thu 7:30 PM"] : ["Mon 5:00 PM", "Sat 10:00 AM"],
    ratingAvg: Number((3.8 + ((i % 5) * 0.24)).toFixed(1)),
    bankVerified: i % 5 !== 0,
  };
});

// ---------------------------------------------------------------------------
// Mentorship cycles (LMS state, shared by student/mentor/admin views)
// ---------------------------------------------------------------------------
const CYCLE_SEED: { studentName: string; mentorIdx: number; currentWeek: number; meetings: number }[] = [
  { studentName: "Priya Raman", mentorIdx: 2, currentWeek: 5, meetings: 3 },
  { studentName: "Owen Castillo", mentorIdx: 2, currentWeek: 8, meetings: 1 },
  { studentName: "Hana Kobayashi", mentorIdx: 0, currentWeek: 3, meetings: 4 },
  { studentName: "Tariq Farouk", mentorIdx: 4, currentWeek: 11, meetings: 2 },
  { studentName: "Grace Mwangi", mentorIdx: 6, currentWeek: 2, meetings: 0 },
  { studentName: "Leo Fontaine", mentorIdx: 1, currentWeek: 9, meetings: 5 },
  { studentName: "Mira Kapoor", mentorIdx: 5, currentWeek: 6, meetings: 3 },
  { studentName: "Samuel Otieno", mentorIdx: 3, currentWeek: 1, meetings: 1 },
];

export const MENTORSHIP_CYCLES: MentorshipCycle[] = CYCLE_SEED.map((c, i) => {
  const mentor = MENTOR_DIRECTORY[c.mentorIdx];
  const modules = buildModules(c.currentWeek, i + 1);
  return {
    id: `cyc-${String(i + 1).padStart(3, "0")}`,
    studentId: i === 0 ? CURRENT_USER.student.id : `stu-${String(100 + i)}`,
    studentName: c.studentName,
    mentorId: mentor.id,
    mentorName: mentor.name,
    domain: mentor.domains[0],
    startedOn: "2026-06-15",
    currentWeek: c.currentWeek,
    totalWeeks: 12,
    modules,
    studentRatingOfMentor: c.currentWeek > 3 ? Number((3.6 + ((i % 5) * 0.28)).toFixed(1)) : undefined,
    lastSessionOn: c.meetings > 0 ? "2026-09-09" : undefined,
    meetingsLast10Days: c.meetings,
  };
});

// Cycles owned by the signed-in mock mentor (Devika Sharma, men-003)
export const MENTOR_ACTIVE_CYCLES = MENTORSHIP_CYCLES.filter((c) => c.mentorId === CURRENT_USER.mentor.id);
// Cycle owned by the signed-in mock student (Priya Raman)
export const STUDENT_ACTIVE_CYCLE = MENTORSHIP_CYCLES[0];

// ---------------------------------------------------------------------------
// Inbound mentee requests (mentor "requests" queue)
// ---------------------------------------------------------------------------
export const MENTOR_REQUESTS: MentorRequest[] = [
  { id: "req-001", studentId: "stu-201", studentName: "Ines Duarte", careerGoal: "Transition from finance into product management at a growth-stage fintech.", matchScore: 91, domain: "Product Management", requestedOn: "2026-09-08", status: "pending" },
  { id: "req-002", studentId: "stu-202", studentName: "Rahul Bose", careerGoal: "Break into applied ML research after a data analyst role.", matchScore: 84, domain: "Data Science", requestedOn: "2026-09-07", status: "pending" },
  { id: "req-003", studentId: "stu-203", studentName: "Chidi Okafor", careerGoal: "Move from IC engineering into a technical lead track.", matchScore: 77, domain: "Software Engineering", requestedOn: "2026-09-05", status: "pending" },
  { id: "req-004", studentId: "stu-204", studentName: "Yuki Tanaka", careerGoal: "Pivot from consulting into climate policy analysis.", matchScore: 72, domain: "Public Policy", requestedOn: "2026-09-02", status: "declined" },
];

// ---------------------------------------------------------------------------
// Payroll ledger (mentor payouts view + admin payroll console)
// ---------------------------------------------------------------------------
const PAYOUT_STATUS_CYCLE: PayoutEntry["status"][] = ["Disbursed", "Approved", "Held - Pending Grade", "Held - Session Incomplete"];

export const PAYOUT_LEDGER: PayoutEntry[] = MENTORSHIP_CYCLES.flatMap((cycle, ci) =>
  Array.from({ length: Math.min(cycle.currentWeek, 6) }, (_, wi) => {
    const week = cycle.currentWeek - wi;
    if (week < 1) return null;
    const mod = cycle.modules[week - 1];
    const gradeSubmitted = !!mod.assignment?.grade;
    const sessionMinutes = mod.sessionMinutes ?? 0;
    let status: PayoutEntry["status"];
    if (!gradeSubmitted) status = "Held - Pending Grade";
    else if (sessionMinutes < 30) status = "Held - Session Incomplete";
    else status = PAYOUT_STATUS_CYCLE[(ci + week) % 2 === 0 ? 0 : 1];
    return {
      id: `pay-${cycle.id}-w${week}`,
      cycleId: cycle.id,
      mentorId: cycle.mentorId,
      studentName: cycle.studentName,
      week,
      amount: 65,
      status,
      gradeSubmitted,
      sessionMinutes,
      verifiedPayoutMethod: MENTOR_DIRECTORY.find((m) => m.id === cycle.mentorId)?.bankVerified ?? false,
    } as PayoutEntry;
  }).filter(Boolean) as PayoutEntry[]
);

export const MENTOR_PAYOUTS = PAYOUT_LEDGER.filter((p) => p.mentorId === CURRENT_USER.mentor.id);

// ---------------------------------------------------------------------------
// Accreditation queue (admin)
// ---------------------------------------------------------------------------
export const ACCREDITATION_QUEUE: AccreditationCandidate[] = [
  { id: "acc-001", name: "Nathaniel Cole", email: "n.cole@alum.edu", claimedTitle: "Senior Data Engineer", claimedCompany: "Vantage Analytics", gradYear: 2016, degreeDoc: "degree-cole.pdf", employmentDoc: "offer-letter-cole.pdf", submittedOn: "2026-09-10", status: "pending" },
  { id: "acc-002", name: "Beatrice Lund", email: "b.lund@alum.edu", claimedTitle: "Product Design Lead", claimedCompany: "Harbor Studio", gradYear: 2013, degreeDoc: "degree-lund.pdf", employmentDoc: "linkedin-export-lund.pdf", submittedOn: "2026-09-09", status: "pending" },
  { id: "acc-003", name: "Victor Adeyemi", email: "v.adeyemi@alum.edu", claimedTitle: "Investment Associate", claimedCompany: "Kestrel Capital", gradYear: 2019, degreeDoc: "degree-adeyemi.pdf", employmentDoc: "paystub-adeyemi.pdf", submittedOn: "2026-09-06", status: "pending" },
  { id: "acc-004", name: "Claire Dubois", email: "c.dubois@alum.edu", claimedTitle: "Policy Advisor", claimedCompany: "Meridian Institute", gradYear: 2011, degreeDoc: "degree-dubois.pdf", employmentDoc: "offer-letter-dubois.pdf", submittedOn: "2026-08-30", status: "approved" },
];

// ---------------------------------------------------------------------------
// Disputes / inactivity alerts (admin)
// ---------------------------------------------------------------------------
export const DISPUTE_ALERTS: DisputeAlert[] = MENTORSHIP_CYCLES.filter((c) => c.meetingsLast10Days === 0).map((c, i) => ({
  id: `dis-${String(i + 1).padStart(3, "0")}`,
  cycleId: c.id,
  studentName: c.studentName,
  mentorName: c.mentorName,
  meetingsLast10Days: c.meetingsLast10Days,
  currentWeek: c.currentWeek,
  flaggedOn: "2026-09-11",
  status: "open",
}));

// ---------------------------------------------------------------------------
// Admin master pairing table
// ---------------------------------------------------------------------------
export const ADMIN_PAIRS: AdminPairRow[] = MENTORSHIP_CYCLES.map((c) => {
  const mentor = MENTOR_DIRECTORY.find((m) => m.id === c.mentorId)!;
  const grades = c.modules.filter((m) => m.assignment?.grade).map((m) => m.assignment!.grade!);
  const avg = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
  return {
    cycleId: c.id,
    studentName: c.studentName,
    mentorName: c.mentorName,
    mentorCapacityLoad: `${mentor.activeMentees}/${mentor.capacity}`,
    currentWeek: c.currentWeek,
    avgAssignmentGrade: avg,
    studentRatingOfMentor: c.studentRatingOfMentor ?? null,
    lastSessionOn: c.lastSessionOn ?? null,
    attendanceLog: Array.from({ length: Math.min(c.meetingsLast10Days, 4) }, (_, i) => ({
      date: `2026-09-0${(i % 9) + 1}`,
      durationMinutes: 28 + i * 6,
    })),
  };
});

// ---------------------------------------------------------------------------
// KPI aggregates for the admin dashboard
// ---------------------------------------------------------------------------
export const ADMIN_KPIS = {
  totalStudents: 214,
  totalMentors: MENTOR_DIRECTORY.length + 42,
  activeCycles: MENTORSHIP_CYCLES.length + 61,
  completedCohorts: 17,
  flaggedInactivity: DISPUTE_ALERTS.length,
  accruedEscrow: PAYOUT_LEDGER.filter((p) => p.status !== "Disbursed").reduce((a, p) => a + p.amount, 0) * 9,
};

export const CAPACITY_TREND = [
  { month: "Apr", students: 142, mentors: 58 },
  { month: "May", students: 158, mentors: 61 },
  { month: "Jun", students: 171, mentors: 65 },
  { month: "Jul", students: 189, mentors: 70 },
  { month: "Aug", students: 201, mentors: 76 },
  { month: "Sep", students: 214, mentors: 82 },
];

export const DOMAIN_DISTRIBUTION = DOMAINS.map((d, i) => ({
  domain: d,
  cohorts: 8 + ((i * 5) % 22),
}));
