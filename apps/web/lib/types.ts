export type AttemptMode = "FULL" | "DISCIPLINE" | "ALL_YEARS";
export type ContestType = "STANDARD" | "RECURRING";
export type ForeignLanguage = "ENGLISH" | "SPANISH";
export type StudyStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type Option = "A" | "B" | "C" | "D" | "E";

export interface User {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface Contest {
  id: string;
  userId: string;
  name: string;
  targetDate: string | null;
  type: ContestType;
  systemManaged: boolean;
  desiredArea: string | null;
  description: string | null;
  storageDirectory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  name: string;
  organization: string;
  year: number;
  role: string | null;
  answerOptions: Option[];
  defaultDurationMinutes: number;
  extendedDurationMinutes: number;
}

export interface ExamOption extends Exam {
  questionCount: number;
  maxWeightedScore: number;
  hasLanguageVariants: boolean;
  availableLanguages: ForeignLanguage[];
  durationOptions: Array<{
    minutes: number;
    label: string;
    extended: boolean;
  }>;
  dayOptions: Array<{
    day: 1 | 2;
    label: string;
    areas: string[];
    includesEssay: boolean;
    officialDurationMinutes: number;
    essayReservedMinutes: number;
    objectiveDurationMinutes: number;
    extendedObjectiveDurationMinutes: number;
    questionCount: number;
    maxWeightedScore: number;
    hasLanguageVariants: boolean;
    availableLanguages: ForeignLanguage[];
    durationOptions: Array<{
      minutes: number;
      label: string;
      extended: boolean;
    }>;
  }>;
}

export interface DisciplineOption {
  name: string;
  questionCount: number;
  bestPercentage: number | null;
  progressStatus: "NOT_STARTED" | "MASTERED" | "GOOD" | "REVIEW";
}

export interface TrainingSubjectOption {
  id: number;
  name: string;
  detail: string | null;
  topicCode: string | null;
  topicTitle: string | null;
  competencyCodes: string[];
  skillCodes: string[];
  questionCount: number;
  correctQuestionCount: number;
  unmasteredQuestionCount: number;
}

export interface TrainingTopicReference {
  id: number;
  subject: string;
  topicCode: string | null;
  topicTitle: string | null;
}

export interface Question {
  id: number;
  examId: string;
  examName: string;
  examYear: number;
  number: number;
  examDay: number | null;
  discipline: string;
  subject: string;
  weight: number;
  sourcePage: number;
  sourceImage: string;
  contextImage: string | null;
  options: Option[];
}

export interface AttemptDraft {
  answers: Array<{
    questionId: number;
    selectedAnswer: Option;
  }>;
  questionTimes: Array<{
    questionId: number;
    timeSpentSeconds: number;
  }>;
  currentIndex: number;
  elapsedSeconds: number;
  savedAt: string | null;
}

export interface StartedAttempt {
  attemptId: string;
  exam: Exam;
  mode: AttemptMode;
  examDay: number | null;
  discipline: string | null;
  trainingTopic: TrainingTopicReference | null;
  includeCorrectAnswers: boolean;
  foreignLanguage: ForeignLanguage | null;
  startedAt: string;
  timeLimitSeconds: number;
  targetSecondsPerQuestion: number;
  totalQuestions: number;
  draft: AttemptDraft;
  questions: Question[];
}

export interface DraftAttempt {
  id: string;
  exam: Exam;
  mode: AttemptMode;
  examDay: number | null;
  discipline: string | null;
  trainingTopic: TrainingTopicReference | null;
  includeCorrectAnswers: boolean;
  foreignLanguage: ForeignLanguage | null;
  startedAt: string;
  lastSavedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  currentIndex: number;
  elapsedSeconds: number;
}

export interface DisciplineResult {
  name: string;
  total: number;
  correct: number;
  points: number;
  maxPoints: number;
  percentage: number;
}

export interface Recommendation {
  id: number;
  discipline: string;
  subject: string;
  detail: string | null;
  misses: number;
}

export interface AttemptResult {
  id: string;
  completed: boolean;
  exam: Exam;
  mode: AttemptMode;
  examDay: number | null;
  discipline: string | null;
  trainingTopic: TrainingTopicReference | null;
  includeCorrectAnswers: boolean;
  foreignLanguage: ForeignLanguage | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  timeLimitSeconds: number;
  targetSecondsPerQuestion: number;
  timingAvailable: boolean;
  timedQuestionCount: number;
  fasterQuestionCount: number;
  timeBalanceSeconds: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  annulledQuestions: number;
  rawPercentage: number;
  weightedScore: number;
  maxWeightedScore: number;
  weightedPercentage: number;
  disciplines: DisciplineResult[];
  recommendations: Recommendation[];
  answers: Array<{
    questionId: number;
    questionNumber: number;
    examId: string;
    examName: string;
    examYear: number;
    examDay: number | null;
    sourcePage: number;
    selectedAnswer: Option | null;
    correctAnswer: Option | null;
    isCorrect: boolean;
    annulled: boolean;
    discipline: string;
    subject: string;
    sourceImage: string;
    timeSpentSeconds: number;
    exceededTarget: boolean;
  }>;
}

export interface StudyTopic {
  id: number;
  module: string;
  discipline: string;
  syllabusItem: string;
  subject: string;
  detail: string | null;
  page: string;
  suggestedPriority: string;
  topicCode: string | null;
  topicTitle: string | null;
  isGroup: boolean;
  competencyCodes: string[];
  skillCodes: string[];
  sortOrder: number;
  status: StudyStatus;
  progress: number;
  questionsCompleted: number;
  correctAnswers: number;
  notes: string | null;
  videoLessons: Array<{
    label: string;
    url: string;
  }>;
}

export interface StudyCatalog {
  cognitiveAxes: Array<{
    code: string;
    title: string;
    description: string;
  }>;
  modules: Array<{
    name: string;
    topics: Array<{
      code: string;
      title: string;
      module: string;
      page: string;
      competencyCodes: string[];
      skillCodes: string[];
      completedSubjects: number;
      totalSubjects: number;
      progress: number;
      subjects: StudyTopic[];
    }>;
  }>;
}

export interface StudySummary {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  progress: number;
  disciplines: Array<{ name: string; total: number; progress: number }>;
}

export interface DashboardData {
  attempts: number;
  averageScore: number;
  bestScore: number;
  lastScore: number;
  studyProgress: number;
  completedTopics: number;
  totalTopics: number;
  trend: Array<{ label: string; score: number; completedAt: string }>;
  disciplines: Array<{ name: string; attempts: number; accuracy: number }>;
  nextTopics: StudyTopic[];
  studyTime: StudyTimeSummary;
}

export interface StudyTimeSummary {
  calculatedAt: string;
  todaySeconds: number;
  totalSeconds: number;
  questionTodaySeconds: number;
  manualTodaySeconds: number;
  manualRunning: boolean;
  manualStartedAt: string | null;
}

export interface HistoryItem {
  id: string;
  exam: Exam;
  mode: AttemptMode;
  examDay: number | null;
  discipline: string | null;
  trainingTopic: TrainingTopicReference | null;
  includeCorrectAnswers: boolean;
  foreignLanguage: ForeignLanguage | null;
  completedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  weightedScore: number;
  maxWeightedScore: number;
  weightedPercentage: number;
  durationSeconds: number;
  timeLimitSeconds: number;
  targetSecondsPerQuestion: number;
}

export interface ReusableExam {
  id: string;
  name: string;
  organization: string;
  year: number;
  role: string | null;
  questionCount: number;
  sources: Array<{
    id: string;
    name: string;
    type: ContestType;
  }>;
}
