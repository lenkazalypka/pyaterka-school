export type ProfileDraft = {
  firstName: string; lastName: string; birthDate: string; phone: string; city: string;
  timezone: string; grade: number; school: string; contactMethod: "email" | "phone" | "messenger";
};

export type ExamOption = { id: string; code: "ege" | "oge"; name: string };
export type SubjectOption = { id: string; name: string; code: string; maxScore: number; scoreUnit: "test_score" | "primary_score"; scoreLabel: string };
export type SubjectDraft = { subjectId: string; currentGrade: number; lastMockScore: number | null; confidence: number; targetScore: number; weakTopics: string[]; comment: string };
export type AdmissionGoalDraft = { institutionType: "university" | "college"; institutionName: string; directionName: string; city: string; fundingType: "budget" | "paid" | "either"; priority: number; minimumPassingScore: number | null; desiredScore: number; needsAdmissionHelp: boolean; needsCareerGuidance: boolean };
export type ScheduleDraft = { weeklyHours: number; preferredFormat: "group" | "individual" | "mixed"; strictControl: boolean; dailyReminders: boolean; otherCourses: string; currentWeeklyLoad: number; desiredStartDate: string; timezone: string; slots: { weekday: number; startsAt: string; endsAt: string }[] };
export type ParentDraft = { inviteRequested: boolean; parentName: string; email: string; phone: string; relation: string };
export type PlanOption = { id: string; name: string; code: string; basePriceMinor: number; pricesMinor: Record<number, number>; currency: string; maxSubjects: number; features: { code: string; enabled: boolean; limit: number | null }[] };

export type ReviewData = {
  profile: ProfileDraft;
  exam: string;
  subjects: (SubjectDraft & { name: string; scoreLabel: string })[];
  goals: AdmissionGoalDraft[];
  schedule: ScheduleDraft;
  parent: ParentDraft;
  plan: PlanOption;
};
