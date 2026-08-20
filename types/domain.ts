export const roleCodes = ["student", "parent", "teacher", "curator", "admin"] as const;
export type RoleCode = (typeof roleCodes)[number];

export type StudentIdentity = {
  id: string;
  name: string;
  grade: number;
  timezone: string;
};

export type StudentSubjectSummary = {
  id: string;
  subjectId: string;
  name: string;
  target: number;
  scoreUnit: "test_score" | "primary_score";
};

export type StudentEvent = {
  id: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  eventType: string;
  startsAt: string;
  endsAt: string;
  status: string;
  timezone: string;
  subject: string | null;
  teacher: string | null;
  joinUrl: string | null;
};

export type StudentMaterial = {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  materialType: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  downloadUrl: string;
};

export type StudentRecording = {
  id: string;
  lessonId: string;
  title: string;
  durationSeconds: number | null;
  watchUrl: string;
};

export type StudentQuestion = {
  id: string;
  prompt: string;
  difficulty: number;
  topic: string | null;
};

export type StudentAssignment = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  maxScore: number;
  questions: StudentQuestion[];
  submission: null | { status: string; answer: string; score: number | null; checkedAt: string | null };
};

export type StudentLesson = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  objectives: string[];
  subject: string;
  teacher: string | null;
  event: StudentEvent | null;
  materials: StudentMaterial[];
  recording: StudentRecording | null;
  assignments: StudentAssignment[];
  progressStatus: "started" | "completed" | null;
};

export type StudentTask = {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  overdue: boolean;
  status: string;
};

export type StudentLearningData = {
  generatedAt: string;
  identity: StudentIdentity;
  subjects: StudentSubjectSummary[];
  subscription: null | { id: string; planName: string; status: string; priceMinor: number; currency: string };
  events: StudentEvent[];
  lessons: StudentLesson[];
  tasks: StudentTask[];
  progress: { courseId: string; subjectId: string; percent: number; completedLessons: number; currentStage: string | null; lastActivityAt: string | null }[];
  activity: { streakDays: number; weeklyPoints: number; weeklyGoalPoints: number | null; achievements: string[] };
};
