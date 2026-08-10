"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Check,
  Clock3,
  ClipboardList,
  Languages,
  Layers3,
  Play,
  RotateCcw,
  Save,
  Shuffle,
  Timer,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useApp } from "@/components/app-context";
import { CustomSelect } from "@/components/custom-select";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import {
  getSimulationPreferences,
  updateSimulationPreferences,
} from "@/lib/session";
import type {
  AttemptMode,
  DisciplineOption,
  DraftAttempt,
  ExamOption,
  ForeignLanguage,
  StartedAttempt,
  TrainingSubjectOption,
} from "@/lib/types";

const ALL_EXAMS_VALUE = "__all_exams__";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}min`;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

function formatDurationSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [
    hours > 0 ? `${hours}h` : "",
    minutes > 0 ? `${minutes}min` : "",
    remainingSeconds > 0 ? `${remainingSeconds}s` : "",
  ].filter(Boolean);
  return parts.join(" ") || "0min";
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
    : `${minutes}min`;
}

function savedAtLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationPreferenceKey(input: {
  mode: AttemptMode;
  examId: string;
  examDay: 1 | 2;
  discipline: string;
  studyTopicId: string;
  allYearsScope: "RANDOM" | "ALL";
  includeCorrectAnswers: boolean;
}) {
  if (input.mode === "FULL") {
    return `FULL:${input.examId}:${input.examDay}`;
  }
  if (input.studyTopicId) {
    const examScope =
      input.mode === "ALL_YEARS" ? ALL_EXAMS_VALUE : input.examId;
    return `TOPIC:${examScope}:${input.studyTopicId}:${input.includeCorrectAnswers ? "ALL" : "UNMASTERED"}`;
  }
  if (input.mode === "DISCIPLINE") {
    return `DISCIPLINE:${input.examId}:${input.discipline}`;
  }
  return `ALL_YEARS:${input.discipline}:${input.allYearsScope}:${
    input.includeCorrectAnswers ? "ALL" : "UNMASTERED"
  }`;
}

function savedDuration(
  preferences: ReturnType<typeof getSimulationPreferences>,
  key: string,
  fallback: number,
) {
  const value = preferences.durations?.[key];
  return typeof value === "number" && value > 0 ? value : fallback;
}

export default function SimulationSetupPage() {
  const router = useRouter();
  const { selectedContest } = useApp();
  const recurring = selectedContest?.type === "RECURRING";
  const [mode, setMode] = useState<AttemptMode>("FULL");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [drafts, setDrafts] = useState<DraftAttempt[]>([]);
  const [examId, setExamId] = useState("");
  const [examDay, setExamDay] = useState<1 | 2>(1);
  const [durationMinutes, setDurationMinutes] = useState(300);
  const [foreignLanguage, setForeignLanguage] =
    useState<ForeignLanguage>("ENGLISH");
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [subjects, setSubjects] = useState<TrainingSubjectOption[]>([]);
  const [studyTopicId, setStudyTopicId] = useState("");
  const [allYearsScope, setAllYearsScope] = useState<"RANDOM" | "ALL">(
    "RANDOM",
  );
  const [includeCorrectAnswers, setIncludeCorrectAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function preferences() {
    return getSimulationPreferences(selectedContest?.id);
  }

  function remember(patch: Parameters<typeof updateSimulationPreferences>[1]) {
    updateSimulationPreferences(selectedContest?.id, patch);
  }

  function rememberedDuration(key: string, fallback: number) {
    const value = preferences().durations?.[key];
    return typeof value === "number" && value > 0 ? value : fallback;
  }

  function setupDurationKey(
    overrides: Partial<{
      mode: AttemptMode;
      examId: string;
      examDay: 1 | 2;
      discipline: string;
      studyTopicId: string;
      allYearsScope: "RANDOM" | "ALL";
      includeCorrectAnswers: boolean;
    }> = {},
  ) {
    return durationPreferenceKey({
      mode: overrides.mode ?? mode,
      examId: overrides.examId ?? examId,
      examDay: overrides.examDay ?? examDay,
      discipline: overrides.discipline ?? discipline,
      studyTopicId: overrides.studyTopicId ?? studyTopicId,
      allYearsScope: overrides.allYearsScope ?? allYearsScope,
      includeCorrectAnswers:
        overrides.includeCorrectAnswers ?? includeCorrectAnswers,
    });
  }

  useEffect(() => {
    Promise.all([
      apiFetch<ExamOption[]>("/simulations/exams"),
      apiFetch<DraftAttempt[]>("/simulations/drafts"),
    ])
      .then(([examResponse, draftResponse]) => {
        setExams(examResponse);
        setDrafts(draftResponse);
        const saved = getSimulationPreferences();
        const preferredExam =
          examResponse.find((exam) => exam.id === saved.examId) ??
          examResponse[0];
        const preferredDay =
          preferredExam?.dayOptions.find(
            (day) => day.day === saved.examDays?.[preferredExam.id],
          ) ?? preferredExam?.dayOptions[0];
        const setupParams = new URLSearchParams(window.location.search);
        const requestedTopic = setupParams.get("topic");
        const requestedDiscipline = setupParams.get("discipline");
        const nextMode = requestedTopic
          ? setupParams.get("mode") === "ALL_YEARS"
            ? "ALL_YEARS"
            : "DISCIPLINE"
          : (saved.mode ?? "FULL");
        const savedTrainingExamId =
          saved.trainingExamId === ALL_EXAMS_VALUE ||
          examResponse.some((exam) => exam.id === saved.trainingExamId)
            ? saved.trainingExamId
            : undefined;
        const nextExamId = requestedTopic
          ? ALL_EXAMS_VALUE
          : nextMode === "DISCIPLINE"
            ? (savedTrainingExamId ?? preferredExam?.id ?? "")
            : (preferredExam?.id ?? "");
        const nextExamDay = preferredDay?.day ?? 1;
        const nextDiscipline = requestedDiscipline ?? saved.discipline ?? "";
        const nextStudyTopicId = requestedTopic ?? saved.studyTopicId ?? "";
        const nextScope = saved.allYearsScope ?? "RANDOM";
        const includeCorrectAnswersFromLink =
          setupParams.get("includeCorrectAnswers") === "true" ||
          setupParams.get("training") === "topic";
        const nextIncludeCorrectAnswers = requestedTopic
          ? includeCorrectAnswersFromLink
          : (saved.includeCorrectAnswers ?? false);
        const durationKey = durationPreferenceKey({
          mode: nextMode,
          examId: nextExamId,
          examDay: nextExamDay,
          discipline: nextDiscipline,
          studyTopicId: nextStudyTopicId,
          allYearsScope: nextScope,
          includeCorrectAnswers: nextIncludeCorrectAnswers,
        });
        const defaultDuration =
          nextMode === "ALL_YEARS"
            ? 30
            : nextMode === "DISCIPLINE" && nextExamId === ALL_EXAMS_VALUE
              ? examResponse.reduce(
                  (total, exam) => total + exam.defaultDurationMinutes,
                  0,
                )
            : preferredDay?.objectiveDurationMinutes ??
              preferredExam?.defaultDurationMinutes ??
              300;

        setExamId(nextExamId);
        setExamDay(nextExamDay);
        setMode(nextMode);
        setDiscipline(nextDiscipline);
        setStudyTopicId(nextStudyTopicId);
        setAllYearsScope(nextScope);
        setIncludeCorrectAnswers(nextIncludeCorrectAnswers);
        setForeignLanguage(saved.foreignLanguage ?? "ENGLISH");
        setDurationMinutes(savedDuration(saved, durationKey, defaultDuration));
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!recurring && !examId) return;
    const setupParams = new URLSearchParams(window.location.search);
    const saved = getSimulationPreferences();
    apiFetch<DisciplineOption[]>(
      recurring || examId === ALL_EXAMS_VALUE
        ? "/simulations/disciplines"
        : `/simulations/disciplines?examId=${encodeURIComponent(examId)}`,
    )
      .then((response) => {
        setDisciplines(response);
        const requestedDiscipline = new URLSearchParams(
          window.location.search,
        ).get("discipline");
        const requestedTopic = setupParams.get("topic");
        const requestedMode = setupParams.get("mode");
        const nextDiscipline =
          response.find((item) => item.name === requestedDiscipline)?.name ??
          response.find((item) => item.name === saved.discipline)?.name ??
          response[0]?.name ??
          "";
        setDiscipline(nextDiscipline);
        const requestedTraining =
          nextDiscipline === requestedDiscipline &&
          (requestedMode === "ALL_YEARS" ||
            requestedTopic ||
            setupParams.get("training") === "topic");
        const savedMode = recurring
          ? saved.mode === "ALL_YEARS"
            ? "ALL_YEARS"
            : "FULL"
          : saved.mode === "DISCIPLINE"
            ? "DISCIPLINE"
            : "FULL";
        const nextMode = requestedTraining
          ? recurring
            ? "ALL_YEARS"
            : "DISCIPLINE"
          : savedMode;
        setMode(nextMode);
        if (requestedTraining) {
          setAllYearsScope("RANDOM");
          updateSimulationPreferences(null, {
            mode: nextMode,
            trainingExamId: requestedTopic
              ? ALL_EXAMS_VALUE
              : saved.trainingExamId,
          });
        } else if (!saved.studyTopicId && nextMode !== "FULL") {
          const nextQuestionCount =
            response.find((item) => item.name === nextDiscipline)
              ?.questionCount ?? 0;
          const scope = saved.allYearsScope ?? "RANDOM";
          const fallback =
            nextMode === "ALL_YEARS"
              ? scope === "RANDOM"
                ? 30
                : Math.max(1, nextQuestionCount * 3)
              : examId === ALL_EXAMS_VALUE
                ? exams.reduce(
                    (total, exam) => total + exam.defaultDurationMinutes,
                    0,
                  )
                : (exams.find((exam) => exam.id === examId)
                    ?.defaultDurationMinutes ?? 300);
          const key = durationPreferenceKey({
            mode: nextMode,
            examId,
            examDay: 1,
            discipline: nextDiscipline,
            studyTopicId: "",
            allYearsScope: scope,
            includeCorrectAnswers: saved.includeCorrectAnswers ?? false,
          });
          setDurationMinutes(savedDuration(saved, key, fallback));
        }
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, [examId, exams, recurring]);

  useEffect(() => {
    if (!discipline || (!recurring && !examId)) {
      return;
    }
    const examQuery =
      !recurring && examId !== ALL_EXAMS_VALUE
        ? `&examId=${encodeURIComponent(examId)}`
        : "";
    apiFetch<TrainingSubjectOption[]>(
      `/simulations/subjects?discipline=${encodeURIComponent(discipline)}${examQuery}`,
    )
      .then((response) => {
        setSubjects(response);
        const saved = getSimulationPreferences();
        const setupParams = new URLSearchParams(window.location.search);
        const requestedTopic = setupParams.get("topic");
        const preferredTopic =
          requestedTopic ?? (mode !== "FULL" ? saved.studyTopicId : undefined);
        const preferredSubject = response.find(
          (item) => String(item.id) === preferredTopic,
        );
        if (preferredSubject) {
          const includeAnswered =
            requestedTopic !== null
              ? setupParams.get("includeCorrectAnswers") === "true" ||
                setupParams.get("training") === "topic"
              : (saved.includeCorrectAnswers ?? false);
          const questionCount = includeAnswered
            ? preferredSubject.questionCount
            : preferredSubject.unmasteredQuestionCount;
          const nextMode = requestedTopic
            ? recurring
              ? "ALL_YEARS"
              : "DISCIPLINE"
            : mode;
          const nextScope = requestedTopic
            ? "RANDOM"
            : (saved.allYearsScope ?? "RANDOM");
          const key = durationPreferenceKey({
            mode: nextMode,
            examId,
            examDay: 1,
            discipline,
            studyTopicId: String(preferredSubject.id),
            allYearsScope: nextScope,
            includeCorrectAnswers: includeAnswered,
          });
          setAllYearsScope(nextScope);
          setIncludeCorrectAnswers(includeAnswered);
          setDurationMinutes(
            savedDuration(
              saved,
              key,
              Math.max(
                1,
                (recurring ? Math.min(10, questionCount) : questionCount) * 3,
              ),
            ),
          );
          setStudyTopicId(String(preferredSubject.id));
          return;
        }
        setStudyTopicId((current) =>
          response.some((item) => String(item.id) === current) ? current : "",
        );
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, [discipline, examId, mode, recurring]);

  const selectedExam = exams.find((exam) => exam.id === examId);
  const allExamsSelected = examId === ALL_EXAMS_VALUE;
  const fullModeExam =
    selectedExam ??
    exams.find((exam) => exam.id === getSimulationPreferences().examId) ??
    exams[0];
  const examScopeQuestionCount = allExamsSelected
    ? exams.reduce((total, exam) => total + exam.questionCount, 0)
    : (selectedExam?.questionCount ?? 0);
  const examScopeDefaultDuration = allExamsSelected
    ? exams.reduce(
        (total, exam) => total + exam.defaultDurationMinutes,
        0,
      )
    : (selectedExam?.defaultDurationMinutes ?? 300);
  const examScopeExtendedDuration = allExamsSelected
    ? exams.reduce(
        (total, exam) => total + exam.extendedDurationMinutes,
        0,
      )
    : (selectedExam?.extendedDurationMinutes ?? 360);
  const examScopeDurationOptions = allExamsSelected
    ? [
        {
          minutes: examScopeDefaultDuration,
          label: `${formatDuration(examScopeDefaultDuration)} para todas as provas (tempo regular)`,
          extended: false,
        },
        {
          minutes: examScopeExtendedDuration,
          label: `${formatDuration(examScopeExtendedDuration)} para todas as provas (tempo adicional)`,
          extended: true,
        },
      ]
    : (selectedExam?.durationOptions ?? []);
  const selectedDay = selectedExam?.dayOptions.find(
    (option) => option.day === examDay,
  );
  const disciplineQuestionCount =
    disciplines.find((item) => item.name === discipline)?.questionCount ?? 0;
  const allYearsQuestionCount = disciplineQuestionCount;
  const selectedSubject =
    mode === "FULL"
      ? undefined
      : subjects.find((item) => String(item.id) === studyTopicId);
  const availableSubjectQuestions = selectedSubject
    ? includeCorrectAnswers
      ? selectedSubject.questionCount
      : selectedSubject.unmasteredQuestionCount
    : allYearsQuestionCount;
  const allYearsUnmasteredQuestionCount = subjects.reduce(
    (total, subject) => total + subject.unmasteredQuestionCount,
    0,
  );
  const randomAllSubjects =
    mode === "ALL_YEARS" &&
    allYearsScope === "RANDOM" &&
    selectedSubject === undefined;
  const availableRandomQuestions = selectedSubject
    ? availableSubjectQuestions
    : includeCorrectAnswers
      ? allYearsQuestionCount
      : allYearsUnmasteredQuestionCount;
  const focusedQuestionCount =
    selectedSubject
      ? recurring
        ? Math.min(10, availableSubjectQuestions)
        : availableSubjectQuestions
      : randomAllSubjects
        ? 10
        : allYearsQuestionCount;
  const canStartFocusedTraining = selectedSubject
    ? availableRandomQuestions > 0
    : !randomAllSubjects || availableRandomQuestions >= 10;
  const allYearsDefaultDuration = Math.max(1, focusedQuestionCount * 3);
  const allYearsExtendedDuration = Math.max(1, focusedQuestionCount * 4);
  const allYearsDurationOptions = [
    {
      minutes: allYearsDefaultDuration,
      label: `${formatDuration(allYearsDefaultDuration)} · ritmo de 3 min por questão`,
    },
    {
      minutes: allYearsExtendedDuration,
      label: `${formatDuration(allYearsExtendedDuration)} · ritmo de 4 min por questão`,
    },
  ];
  const disciplineTrainingQuestionCount = selectedSubject
    ? focusedQuestionCount
    : disciplineQuestionCount;
  const selectedQuestionCount =
    mode === "ALL_YEARS"
      ? focusedQuestionCount
      : mode === "DISCIPLINE"
        ? disciplineTrainingQuestionCount
        : recurring && selectedDay
          ? selectedDay.questionCount
          : (selectedExam?.questionCount ?? 0);
  const disciplineDurationOptions = examScopeDurationOptions.map(
    (option) => {
      const paceSeconds = examScopeQuestionCount
        ? Math.round((option.minutes * 60) / examScopeQuestionCount)
        : 0;
      return {
        ...option,
        label: `${formatDurationSeconds(
          paceSeconds * disciplineTrainingQuestionCount,
        )} · ritmo de ${formatDurationSeconds(paceSeconds)} por questão`,
      };
    },
  );
  const durationOptions =
    mode === "ALL_YEARS" || selectedSubject
      ? allYearsDurationOptions
      : mode === "DISCIPLINE"
        ? disciplineDurationOptions
        : recurring && selectedDay
          ? selectedDay.durationOptions
          : (selectedExam?.durationOptions ?? []);
  const selectedHasLanguageVariants =
    mode === "FULL" &&
    (recurring
      ? (selectedDay?.hasLanguageVariants ?? false)
      : (selectedExam?.hasLanguageVariants ?? false));
  const targetSeconds =
    selectedQuestionCount > 0 &&
    (mode !== "DISCIPLINE" || examScopeQuestionCount > 0)
      ? Math.round(
          (durationMinutes * 60) /
            (mode === "DISCIPLINE" && !selectedSubject
              ? examScopeQuestionCount
              : selectedQuestionCount),
        )
      : 0;
  const targetMinutes = Math.floor(targetSeconds / 60);
  const targetRemainingSeconds = targetSeconds % 60;

  function chooseExam(nextExamId: string) {
    const nextExam = exams.find((exam) => exam.id === nextExamId);
    const nextAllExams = nextExamId === ALL_EXAMS_VALUE;
    const savedDay = preferences().examDays?.[nextExamId];
    const nextDay =
      nextExam?.dayOptions.find((day) => day.day === savedDay) ??
      nextExam?.dayOptions[0];
    const nextExamDay = nextDay?.day ?? 1;
    const nextScopeDefaultDuration = nextAllExams
      ? exams.reduce(
          (total, exam) => total + exam.defaultDurationMinutes,
          0,
        )
      : (nextExam?.defaultDurationMinutes ?? 300);
    const fallback = selectedSubject
      ? allYearsDefaultDuration
      : mode === "ALL_YEARS"
        ? allYearsDefaultDuration
        : mode === "DISCIPLINE"
          ? nextScopeDefaultDuration
          : (nextDay?.objectiveDurationMinutes ??
            nextExam?.defaultDurationMinutes ??
            300);
    const key = setupDurationKey({
      examId: nextExamId,
      examDay: nextExamDay,
    });
    setExamId(nextExamId);
    setExamDay(nextExamDay);
    setDurationMinutes(rememberedDuration(key, fallback));
    if (nextAllExams) {
      remember({ trainingExamId: ALL_EXAMS_VALUE });
    } else {
      remember({
        examId: nextExamId,
        trainingExamId:
          mode === "DISCIPLINE" ? nextExamId : preferences().trainingExamId,
        examDays: { [nextExamId]: nextExamDay },
      });
    }
  }

  function chooseMode(nextMode: AttemptMode) {
    const saved = preferences();
    const savedTrainingExamIsValid =
      saved.trainingExamId === ALL_EXAMS_VALUE ||
      exams.some((exam) => exam.id === saved.trainingExamId);
    const savedFullExam =
      exams.find((exam) => exam.id === saved.examId) ?? exams[0];
    const nextExamId = recurring
      ? examId
      : nextMode === "FULL"
        ? (savedFullExam?.id ?? "")
        : nextMode === "DISCIPLINE"
          ? savedTrainingExamIsValid
            ? saved.trainingExamId!
            : (selectedExam?.id ?? savedFullExam?.id ?? "")
          : examId;
    const nextExam = exams.find((exam) => exam.id === nextExamId);
    const nextScopeDefaultDuration =
      nextExamId === ALL_EXAMS_VALUE
        ? exams.reduce(
            (total, exam) => total + exam.defaultDurationMinutes,
            0,
          )
        : (nextExam?.defaultDurationMinutes ?? 300);
    const fallback =
      nextMode === "ALL_YEARS" || selectedSubject
        ? allYearsDefaultDuration
        : nextMode === "DISCIPLINE"
          ? nextScopeDefaultDuration
          : (selectedDay?.objectiveDurationMinutes ??
            nextExam?.defaultDurationMinutes ??
            300);
    const key = setupDurationKey({ mode: nextMode, examId: nextExamId });
    setExamId(nextExamId);
    setMode(nextMode);
    setDurationMinutes(rememberedDuration(key, fallback));
    remember({ mode: nextMode });
  }

  function chooseExamDay(value: string) {
    const nextDay = Number(value) as 1 | 2;
    const option = selectedExam?.dayOptions.find(
      (candidate) => candidate.day === nextDay,
    );
    const key = setupDurationKey({ examDay: nextDay });
    setExamDay(nextDay);
    setDurationMinutes(
      rememberedDuration(
        key,
        option?.objectiveDurationMinutes ??
          selectedExam?.defaultDurationMinutes ??
          300,
      ),
    );
    if (examId) remember({ examDays: { [examId]: nextDay } });
  }

  function chooseDiscipline(nextDiscipline: string) {
    setDiscipline(nextDiscipline);
    setStudyTopicId("");
    setIncludeCorrectAnswers(false);
    const questionCount =
      disciplines.find((item) => item.name === nextDiscipline)?.questionCount ??
      0;
    if (mode !== "FULL") {
      const fallback =
        mode === "ALL_YEARS"
          ? allYearsScope === "RANDOM"
            ? 30
            : Math.max(1, questionCount * 3)
          : examScopeDefaultDuration;
      const key = setupDurationKey({
        discipline: nextDiscipline,
        studyTopicId: "",
        includeCorrectAnswers: false,
      });
      setDurationMinutes(rememberedDuration(key, fallback));
    }
    remember({
      discipline: nextDiscipline,
      studyTopicId: "",
      includeCorrectAnswers: false,
    });
  }

  function chooseSubject(nextStudyTopicId: string) {
    const nextSubject = subjects.find(
      (item) => String(item.id) === nextStudyTopicId,
    );
    setAllYearsScope("RANDOM");
    setStudyTopicId(nextStudyTopicId);
    setIncludeCorrectAnswers(false);
    const unmasteredQuestionCount = nextSubject?.unmasteredQuestionCount ?? 0;
    const nextFocusedQuestionCount = recurring
      ? Math.min(10, unmasteredQuestionCount)
      : unmasteredQuestionCount;
    const fallback = nextSubject
      ? Math.max(1, nextFocusedQuestionCount * 3)
      : mode === "ALL_YEARS"
        ? 30
        : examScopeDefaultDuration;
    const key = setupDurationKey({
      studyTopicId: nextStudyTopicId,
      allYearsScope: "RANDOM",
      includeCorrectAnswers: false,
    });
    setDurationMinutes(rememberedDuration(key, fallback));
    remember({
      studyTopicId: nextStudyTopicId,
      allYearsScope: "RANDOM",
      includeCorrectAnswers: false,
    });
  }

  function toggleCorrectAnswers(nextValue: boolean) {
    setIncludeCorrectAnswers(nextValue);
    if (!selectedSubject) return;
    const nextQuestionCount = nextValue
      ? selectedSubject.questionCount
      : selectedSubject.unmasteredQuestionCount;
    const nextFocusedQuestionCount = recurring
      ? Math.min(10, nextQuestionCount)
      : nextQuestionCount;
    const fallback = Math.max(1, nextFocusedQuestionCount * 3);
    const key = setupDurationKey({ includeCorrectAnswers: nextValue });
    setDurationMinutes(rememberedDuration(key, fallback));
    remember({ includeCorrectAnswers: nextValue });
  }

  function chooseAllYearsScope(nextScope: "RANDOM" | "ALL") {
    setAllYearsScope(nextScope);
    setStudyTopicId("");
    setIncludeCorrectAnswers(false);
    const fallback =
      nextScope === "RANDOM"
        ? 30
        : Math.max(1, allYearsQuestionCount * 3);
    const key = setupDurationKey({
      allYearsScope: nextScope,
      studyTopicId: "",
      includeCorrectAnswers: false,
    });
    setDurationMinutes(rememberedDuration(key, fallback));
    remember({
      allYearsScope: nextScope,
      studyTopicId: "",
      includeCorrectAnswers: false,
    });
  }

  function chooseDuration(value: string) {
    const minutes = Number(value);
    setDurationMinutes(minutes);
    remember({ durations: { [setupDurationKey()]: minutes } });
  }

  function chooseForeignLanguage(value: string) {
    const language = value as ForeignLanguage;
    setForeignLanguage(language);
    remember({ foreignLanguage: language });
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await apiFetch<StartedAttempt>("/simulations", {
          method: "POST",
          body: JSON.stringify({
            examId:
              mode === "ALL_YEARS" || allExamsSelected ? undefined : examId,
            allExams:
              mode === "DISCIPLINE" && allExamsSelected ? true : undefined,
            examDay: recurring && mode === "FULL" ? examDay : undefined,
            mode,
            durationMinutes,
            discipline:
              mode === "DISCIPLINE" || mode === "ALL_YEARS"
                ? discipline
                : undefined,
            studyTopicId:
              mode !== "FULL" && studyTopicId
                ? Number(studyTopicId)
                : undefined,
            includeCorrectAnswers:
              selectedSubject ||
              (mode === "ALL_YEARS" && allYearsScope === "RANDOM")
                ? includeCorrectAnswers
                : undefined,
            randomizeQuestions:
              mode === "ALL_YEARS" && randomAllSubjects ? true : undefined,
            foreignLanguage: selectedHasLanguageVariants
              ? foreignLanguage
              : undefined,
          }),
        });
        localStorage.setItem(
          `attempt:${response.attemptId}`,
          JSON.stringify(response),
        );
        router.push(`/simulado/${response.attemptId}`);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Não foi possível iniciar.",
        );
      }
    });
  }

  async function deleteDraft(draft: DraftAttempt) {
    const confirmed = window.confirm(
      `Excluir o simulado em andamento “${draft.exam.name}”? As respostas e o tempo salvos serão removidos.`,
    );
    if (!confirmed) return;

    setError(null);
    setDeletingDraftId(draft.id);
    try {
      await apiFetch<{ id: string }>(`/simulations/${draft.id}`, {
        method: "DELETE",
      });
      localStorage.removeItem(`attempt-state:${draft.id}`);
      localStorage.removeItem(`attempt:${draft.id}`);
      sessionStorage.removeItem(`attempt-state:${draft.id}`);
      sessionStorage.removeItem(`attempt:${draft.id}`);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o simulado.",
      );
    } finally {
      setDeletingDraftId(null);
    }
  }

  if (loading) return <LoadingState label="Preparando os modos de treino" />;

  if (exams.length === 0) {
    return (
      <div className="page-stack setup-page">
        <header className="page-heading">
          <span className="eyebrow">Central de treino</span>
          <h1>Este concurso ainda está em branco.</h1>
          <p>
            Nenhuma prova interna foi associada a ele. Os dados de outros
            concursos permanecem separados.
          </p>
        </header>
        {error && <ErrorState message={error} />}
      </div>
    );
  }

  return (
    <div className="page-stack setup-page">
      <header className="page-heading">
        <span className="eyebrow">
          {recurring ? "ConcursoRecorrente" : "Central de treino"}
        </span>
        <h1>
          {recurring
            ? "Escolha uma edição ou treine uma disciplina."
            : "Escolha como você quer praticar."}
        </h1>
        <p>
          {recurring
            ? "Resolva um dos dois dias de uma edição do ENEM ou pratique a mesma matéria com questões das dez edições, de 2016 a 2025."
            : "Escolha uma prova, ajuste o tempo disponível e pratique o conteúdo completo ou uma disciplina específica."}
        </p>
      </header>

      {error && <ErrorState message={error} />}

      {drafts.length > 0 && (
        <section className="panel draft-attempts-panel">
          <header>
            <div>
              <span className="eyebrow">Salvos automaticamente</span>
              <h2>Simulados em andamento</h2>
              <p>
                Retome exatamente da questão em que parou, com respostas e
                tempo acumulado preservados.
              </p>
            </div>
            <Save size={22} />
          </header>
          <div className="draft-attempt-list">
            {drafts.map((draft) => {
              const percentage =
                draft.totalQuestions === 0
                  ? 0
                  : (draft.answeredQuestions / draft.totalQuestions) * 100;
              return (
                <article className="draft-attempt-card" key={draft.id}>
                  <button
                    className="draft-attempt-resume"
                    type="button"
                    onClick={() => router.push(`/simulado/${draft.id}`)}
                  >
                    <span className="draft-attempt-icon">
                      <Play size={18} />
                    </span>
                    <span className="draft-attempt-copy">
                      <strong>
                        {draft.exam.name}
                        {draft.examDay ? ` · Dia ${draft.examDay}` : ""}
                      </strong>
                      <small>
                        {draft.mode === "ALL_YEARS"
                          ? `Treino por disciplina · ${
                              draft.trainingTopic?.subject ?? draft.discipline
                            }`
                          : draft.discipline ?? "Prova completa"}
                      </small>
                      <span className="progress-track">
                        <span style={{ width: `${percentage}%` }} />
                      </span>
                    </span>
                    <span className="draft-attempt-stats">
                      <strong>
                        {draft.answeredQuestions}/{draft.totalQuestions}
                      </strong>
                      <small>
                        Questão {draft.currentIndex + 1} ·{" "}
                        <Clock3 size={12} /> {formatElapsed(draft.elapsedSeconds)}
                      </small>
                      <small>Salvo em {savedAtLabel(draft.lastSavedAt)}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="draft-attempt-delete"
                    type="button"
                    aria-label={`Excluir simulado ${draft.exam.name}`}
                    title="Excluir simulado em andamento"
                    disabled={deletingDraftId === draft.id}
                    onClick={() => void deleteDraft(draft)}
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel exam-settings">
        {mode !== "ALL_YEARS" && (
          <div className="select-field">
            <span>{recurring ? "Ano da prova" : "Prova"}</span>
            <CustomSelect
              ariaLabel={recurring ? "Ano da prova" : "Prova"}
              value={examId}
              onChange={chooseExam}
              options={[
                ...(!recurring && mode === "DISCIPLINE"
                  ? [
                      {
                        value: ALL_EXAMS_VALUE,
                        label: "Todas as provas",
                      },
                    ]
                  : []),
                ...exams.map((exam) => ({
                  value: exam.id,
                  label: exam.name,
                })),
              ]}
            />
          </div>
        )}
        {mode === "ALL_YEARS" && (
          <div className="all-years-summary">
            <BookOpen size={20} />
            <span>
              <strong>{discipline || "Escolha uma disciplina"}</strong>
              <small>
                {exams.length} edições ·{" "}
                {selectedSubject
                  ? `${focusedQuestionCount} ${focusedQuestionCount === 1 ? "questão categorizada" : "questões categorizadas"} de ${selectedSubject.name}`
                  : randomAllSubjects
                    ? "10 questões aleatórias de todos os assuntos"
                    : `${allYearsQuestionCount} questões categorizadas`}
              </small>
            </span>
          </div>
        )}
        {recurring && mode === "FULL" && selectedExam && (
          <div className="select-field">
            <span>Dia da prova</span>
            <CustomSelect
              ariaLabel="Dia da prova do ENEM"
              value={String(examDay)}
              onChange={chooseExamDay}
              options={selectedExam.dayOptions.map((option) => ({
                value: String(option.day),
                label: `${option.label} · ${option.questionCount} questões`,
              }))}
            />
          </div>
        )}
        <div className="select-field">
          <span>Tempo disponível</span>
          <CustomSelect
            ariaLabel="Tempo disponível"
            value={String(durationMinutes)}
            onChange={chooseDuration}
            options={durationOptions.map((option) => ({
              value: String(option.minutes),
              label: option.label,
            }))}
          />
        </div>
        <div className="time-guidance">
          <Timer size={19} />
          <span>
            <strong>
              {targetMinutes}min {targetRemainingSeconds}s por questão
            </strong>
            <small>
              {mode === "DISCIPLINE"
                ? `Mesmo ritmo da prova completa; cronômetro proporcional às ${selectedQuestionCount} questões`
                : "Média calculada para a seleção completa"}
            </small>
          </span>
        </div>
      </section>

      {recurring && mode === "FULL" && selectedDay && (
        <section className="panel language-picker">
          <div>
            <CalendarRange size={20} />
            <span>
              <strong>
                {selectedDay.label} · {selectedDay.areas.join(", ")}
              </strong>
              <small>
                Duração oficial:{" "}
                {formatDuration(selectedDay.officialDurationMinutes)}.
                {selectedDay.includesEssay
                  ? " O cronômetro das questões reserva 1h para a redação."
                  : " Este dia não contém redação."}
              </small>
            </span>
          </div>
          <strong>{selectedDay.questionCount} questões</strong>
        </section>
      )}

      {selectedHasLanguageVariants && (
        <section className="panel language-picker">
          <div>
            <Languages size={20} />
            <span>
              <strong>Idioma estrangeiro</strong>
              <small>As cinco questões de idioma mudam conforme a opção.</small>
            </span>
          </div>
          <CustomSelect
            ariaLabel="Idioma estrangeiro"
            value={foreignLanguage}
            onChange={chooseForeignLanguage}
            options={[
              { value: "ENGLISH", label: "Inglês" },
              { value: "SPANISH", label: "Espanhol" },
            ]}
          />
        </section>
      )}

      <section className="mode-grid">
        <button
          className={`mode-card ${mode === "FULL" ? "selected" : ""}`}
          type="button"
          onClick={() => chooseMode("FULL")}
        >
          <span className="mode-check">
            {mode === "FULL" && <Check size={16} />}
          </span>
          <span className="mode-icon">
            {recurring ? <CalendarRange size={25} /> : <Layers3 size={25} />}
          </span>
          <strong>{recurring ? "Prova por ano" : "Prova completa"}</strong>
          <p>
            {recurring
              ? `${selectedDay?.questionCount ?? 0} questões do Dia ${examDay}, na ordem original da edição escolhida.`
              : `${fullModeExam?.questionCount ?? 0} questões na ordem original.`}
          </p>
          <small>
            <Timer size={15} /> Tempo para resolver:{" "}
            {formatDuration(
              mode === "FULL"
                ? durationMinutes
                : (fullModeExam?.extendedDurationMinutes ?? 0),
            )}
          </small>
        </button>

        {recurring ? (
          <button
            className={`mode-card ${mode === "ALL_YEARS" ? "selected" : ""}`}
            type="button"
            onClick={() => chooseMode("ALL_YEARS")}
            disabled={disciplines.length === 0}
          >
            <span className="mode-check">
              {mode === "ALL_YEARS" && <Check size={16} />}
            </span>
            <span className="mode-icon coral"><BookOpen size={25} /></span>
            <strong>Treino por disciplina</strong>
            <p>
              Escolha uma matéria e, se desejar, um assunto específico para
              receber até 10 questões categorizadas das dez edições.
            </p>
            <small>
              <ClipboardList size={15} /> Matéria de todos os anos
            </small>
          </button>
        ) : (
          <button
            className={`mode-card ${mode === "DISCIPLINE" ? "selected" : ""}`}
            type="button"
            onClick={() => chooseMode("DISCIPLINE")}
          >
            <span className="mode-check">
              {mode === "DISCIPLINE" && <Check size={16} />}
            </span>
            <span className="mode-icon coral"><BookOpen size={25} /></span>
            <strong>Treino por disciplina</strong>
            <p>Concentre a sessão em um único conteúdo e compare sua precisão.</p>
            <small><ClipboardList size={15} /> Sessão focada</small>
          </button>
        )}
      </section>

      {(mode === "DISCIPLINE" || mode === "ALL_YEARS") && (
        <section className="panel discipline-picker">
          <div>
            <span className="eyebrow">Disciplina</span>
            <h2>
              {mode === "ALL_YEARS"
                ? "Qual matéria você quer treinar nos dez anos?"
                : "Qual área precisa de atenção?"}
            </h2>
          </div>
          <div className="discipline-choice-grid">
            {disciplines.map((item) => (
              <label
                className={discipline === item.name ? "selected" : ""}
                key={item.name}
              >
                <input
                  type="radio"
                  name="discipline"
                  value={item.name}
                  checked={discipline === item.name}
                  onChange={() => chooseDiscipline(item.name)}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.questionCount} questões</small>
                </span>
                {item.progressStatus !== "NOT_STARTED" && (
                  <span
                    className={`discipline-progress ${item.progressStatus.toLowerCase()}`}
                    title={
                      item.progressStatus === "MASTERED"
                        ? "Todas as questões da área já foram acertadas"
                        : item.progressStatus === "GOOD"
                          ? `Questões já acertadas: ${Math.round(item.bestPercentage ?? 0)}%`
                          : "Esta área precisa de revisão"
                    }
                  >
                    {item.progressStatus === "REVIEW" ? (
                      <RotateCcw size={13} />
                    ) : (
                      <Check size={14} />
                    )}
                    <em>
                      {item.progressStatus === "REVIEW"
                        ? "Revisar"
                        : `${Math.round(item.bestPercentage ?? 0)}%`}
                    </em>
                  </span>
                )}
              </label>
            ))}
          </div>
          {discipline &&
            ((recurring && mode === "ALL_YEARS") ||
              (!recurring && mode === "DISCIPLINE")) && (
            <div className="subject-training-box">
              <div className="subject-training-heading">
                <span>
                  <span className="eyebrow">
                    {recurring ? "Formato da sessão" : "Filtro por assunto"}
                  </span>
                  <h3>
                    {selectedSubject
                      ? `Foque nas ${focusedQuestionCount} questões disponíveis`
                      : recurring
                        ? "Foque a sessão em 10 questões aleatórias"
                        : "Treine toda a disciplina ou escolha um assunto"}
                  </h3>
                </span>
                <Shuffle size={21} />
              </div>
              {recurring && <div className="session-scope-grid">
                <button
                  className={allYearsScope === "RANDOM" ? "selected" : ""}
                  type="button"
                  aria-pressed={allYearsScope === "RANDOM"}
                  onClick={() => chooseAllYearsScope("RANDOM")}
                >
                  <Shuffle size={19} />
                  <span>
                    <strong>
                      {selectedSubject
                        ? `${focusedQuestionCount} ${focusedQuestionCount === 1 ? "questão do assunto" : "questões do assunto"}`
                        : "10 questões aleatórias"}
                    </strong>
                    <small>
                      {selectedSubject
                        ? "Somente as questões categorizadas diretamente neste assunto."
                        : "De todos os assuntos ou de um assunto específico."}
                    </small>
                  </span>
                  {allYearsScope === "RANDOM" && <Check size={17} />}
                </button>
                <button
                  className={allYearsScope === "ALL" ? "selected" : ""}
                  type="button"
                  aria-pressed={allYearsScope === "ALL"}
                  onClick={() => chooseAllYearsScope("ALL")}
                >
                  <Layers3 size={19} />
                  <span>
                    <strong>Todas as questões de uma vez</strong>
                    <small>
                      As {allYearsQuestionCount} questões da disciplina.
                    </small>
                  </span>
                  {allYearsScope === "ALL" && <Check size={17} />}
                </button>
              </div>}
              {(!recurring || allYearsScope === "RANDOM") && (
                <div className="select-field">
                  <span>Assunto</span>
                  <CustomSelect
                    ariaLabel="Assunto do treino"
                    value={studyTopicId}
                    onChange={chooseSubject}
                    options={[
                      {
                        value: "",
                        label: recurring
                          ? `Todos os assuntos · sortear 10 entre ${allYearsQuestionCount}`
                          : `Toda a disciplina · ${disciplineQuestionCount} questões`,
                      },
                      ...subjects.map((item) => ({
                        value: String(item.id),
                        label: `${item.name} · ${item.questionCount} questões`,
                      })),
                    ]}
                  />
                </div>
              )}
              {selectedSubject && (
                <div className="subject-training-detail">
                  <div>
                    <span className="matrix-code">
                      {selectedSubject.topicCode ?? "Assunto"}
                    </span>
                    <strong>
                      {selectedSubject.topicTitle ?? selectedSubject.name}
                    </strong>
                    <p>{selectedSubject.detail}</p>
                    <div className="matrix-code-list">
                      {selectedSubject.competencyCodes.map((code) => (
                        <span key={code}>{code}</span>
                      ))}
                      {selectedSubject.skillCodes.slice(0, 8).map((code) => (
                        <span key={code}>{code}</span>
                      ))}
                    </div>
                  </div>
                  <div className="subject-question-balance">
                    <span>
                      <strong>{selectedSubject.questionCount}</strong>
                      <small>categorizadas</small>
                    </span>
                    <span>
                      <strong>{selectedSubject.unmasteredQuestionCount}</strong>
                      <small>ainda não acertadas</small>
                    </span>
                  </div>
                </div>
              )}
              {(selectedSubject ||
                (recurring && allYearsScope === "RANDOM")) && (
                <label className="include-mastered-toggle">
                  <input
                    type="checkbox"
                    checked={includeCorrectAnswers}
                    onChange={(event) => toggleCorrectAnswers(event.target.checked)}
                  />
                  <span>
                    <strong>Incluir questões que eu já acertei</strong>
                    <small>
                      Desativado por padrão para priorizar questões inéditas ou
                      que você ainda errou.
                    </small>
                  </span>
                </label>
              )}
              {selectedSubject && availableRandomQuestions === 0 && (
                <p className="subject-training-warning">
                  {includeCorrectAnswers
                    ? "Este assunto ainda não possui questões categorizadas."
                    : "Você já acertou todas as questões deste assunto. Inclua as questões já acertadas para treiná-las novamente."}
                </p>
              )}
              {recurring &&
                randomAllSubjects &&
                !canStartFocusedTraining && (
                <p className="subject-training-warning">
                  Há somente {availableRandomQuestions} questões elegíveis.
                  {includeCorrectAnswers
                    ? " Esta disciplina ainda não possui 10 questões categorizadas."
                    : " Inclua as questões já acertadas para tentar completar o sorteio."}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="start-strip">
        <div>
          <strong>
            {mode === "ALL_YEARS"
              ? selectedSubject
                ? `${discipline} · ${selectedSubject.name} · ${focusedQuestionCount} ${focusedQuestionCount === 1 ? "questão categorizada" : "questões categorizadas"}`
                : randomAllSubjects
                  ? `${discipline} · 10 questões aleatórias de todos os assuntos`
                  : `${discipline} · ${allYearsQuestionCount} questões de ${exams.length} anos`
              : mode === "FULL"
                ? `${selectedExam?.name ?? "Prova"}${recurring ? ` · Dia ${examDay}` : ""} · ${selectedQuestionCount} questões`
                : selectedSubject
                  ? `${allExamsSelected ? "Todas as provas · " : ""}${discipline} · ${selectedSubject.name} · ${selectedQuestionCount} ${selectedQuestionCount === 1 ? "questão categorizada" : "questões categorizadas"}`
                  : `${allExamsSelected ? "Todas as provas · " : ""}${discipline} · ${selectedQuestionCount} questões`}
          </strong>
          <span>O cronômetro começa ao abrir a primeira questão.</span>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={begin}
          disabled={
            isPending ||
            (mode !== "ALL_YEARS" && !examId) ||
            (recurring && mode === "FULL" && !selectedDay) ||
            ((mode === "DISCIPLINE" || mode === "ALL_YEARS") &&
              !discipline) ||
            ((mode === "ALL_YEARS" || selectedSubject) &&
              !canStartFocusedTraining)
          }
        >
          {isPending ? "Criando tentativa..." : "Iniciar agora"}
          {!isPending && <ArrowRight size={18} />}
        </button>
      </section>
    </div>
  );
}
