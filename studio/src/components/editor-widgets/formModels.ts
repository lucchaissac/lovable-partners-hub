export const FORM_TYPES = [
  { id: "checkboxes", label: "Checkboxes" },
  { id: "dropdown", label: "Dropdown" },
  { id: "file", label: "File upload" },
  { id: "choice", label: "Multiple choice" },
  { id: "paragraph", label: "Paragraph" },
  { id: "text", label: "Single line" },
  { id: "url", label: "URL" },
] as const;
export type FormQuestionType = (typeof FORM_TYPES)[number]["id"];
export const FORM_OPERATORS = [
  { id: "is", label: "Is" },
  { id: "not", label: "Is not" },
  { id: "contains", label: "Contains" },
  { id: "excludes", label: "Does not contain" },
  { id: "known", label: "Is known" },
  { id: "unknown", label: "Is unknown" },
] as const;
export type FormRule = {
  id: string;
  operator: (typeof FORM_OPERATORS)[number]["id"];
  value: string;
  action: "show" | "hide" | "jump";
  target: string;
};
export type FormQuestion = {
  id: string;
  type: FormQuestionType;
  label: string;
  description: string;
  required: boolean;
  visible: boolean;
  options: string[];
  rules: FormRule[];
};
export type EditorFormValue = {
  title: string;
  description: string;
  intro: boolean;
  ending: string;
  answerAgain: boolean;
  questions: FormQuestion[];
};
export type FormAnswer = string | string[] | { name: string; size: number }[];
export type FormAnswers = Record<string, FormAnswer>;
export type FormResponse = {
  id: string;
  submittedAt: string;
  answers: { label: string; value: string }[];
};
export const FORM_FILE_LIMIT = 25 * 1024 * 1024;
export function newFormQuestion(type: FormQuestionType): FormQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    label: "",
    description: "",
    required: true,
    visible: true,
    options: ["Option 1", "Option 2"],
    rules: [],
  };
}
export const EMPTY_FORM: EditorFormValue = {
  title: "",
  description: "",
  intro: true,
  ending: "Thanks for your answers.",
  answerAgain: true,
  questions: [],
};
export const SAMPLE_FORM: EditorFormValue = {
  title: "Let’s get your team ready",
  description:
    "Tell us a little about your rollout. We’ll use your answers to prepare for kickoff.",
  intro: true,
  ending: "You’re ready for kickoff.",
  answerAgain: true,
  questions: [
    {
      id: "owner",
      type: "text",
      label: "Who is leading your rollout?",
      description: "The person we should work with on your launch.",
      required: true,
      visible: true,
      options: [],
      rules: [],
    },
    {
      id: "department",
      type: "dropdown",
      label: "Which team are you on?",
      description: "",
      required: true,
      visible: true,
      options: ["Finance", "Operations", "Engineering", "People"],
      rules: [],
    },
    {
      id: "priorities",
      type: "checkboxes",
      label: "What would you like to improve?",
      description: "Choose all that apply.",
      required: true,
      visible: true,
      options: [
        "Expense reporting",
        "Spending visibility",
        "Approval workflows",
      ],
      rules: [],
    },
    {
      id: "website",
      type: "url",
      label: "What is your company website?",
      description: "",
      required: false,
      visible: true,
      options: [],
      rules: [],
    },
    {
      id: "goals",
      type: "paragraph",
      label: "What would a successful launch look like?",
      description: "",
      required: false,
      visible: true,
      options: [],
      rules: [],
    },
    {
      id: "share",
      type: "choice",
      label: "Would you like to share a rollout brief?",
      description: "Choosing Yes reveals the file question.",
      required: true,
      visible: true,
      options: ["Yes", "No"],
      rules: [
        {
          id: "show-brief",
          operator: "is",
          value: "Yes",
          action: "show",
          target: "brief",
        },
      ],
    },
    {
      id: "brief",
      type: "file",
      label: "Add your rollout brief",
      description: "Files remain on your device in this demo.",
      required: false,
      visible: false,
      options: [],
      rules: [],
    },
  ],
};
export function answerText(answer?: FormAnswer): string {
  return typeof answer === "string"
    ? answer
    : (answer || [])
        .map((item) => (typeof item === "string" ? item : item.name))
        .join(", ");
}
export function ruleMatches(rule: FormRule, answer?: FormAnswer): boolean {
  const text = answerText(answer).trim().toLocaleLowerCase(),
    expected = rule.value.trim().toLocaleLowerCase();
  if (rule.operator === "known") return !!text;
  if (rule.operator === "unknown") return !text;
  if (!text || !expected) return false;
  const values = Array.isArray(answer)
    ? answer.map((item) =>
        (typeof item === "string" ? item : item.name)
          .trim()
          .toLocaleLowerCase(),
      )
    : [text];
  if (rule.operator === "is") return values.includes(expected);
  if (rule.operator === "not") return !values.includes(expected);
  return rule.operator === "contains"
    ? text.includes(expected)
    : !text.includes(expected);
}
/** Rules only affect later questions: hidden answers never trigger another rule. */
export function visibleFormQuestions(
  form: EditorFormValue,
  answers: FormAnswers,
): FormQuestion[] {
  const visibility = new Map(form.questions.map((q) => [q.id, q.visible]));
  form.questions.forEach((q, index) => {
    if (!visibility.get(q.id)) return;
    q.rules.forEach((rule) => {
      if (
        rule.action === "jump" ||
        !form.questions
          .slice(index + 1)
          .some((next) => next.id === rule.target) ||
        !ruleMatches(rule, answers[q.id])
      )
        return;
      visibility.set(rule.target, rule.action === "show");
    });
  });
  return form.questions.filter((q) => visibility.get(q.id));
}
export function validateFormAnswer(
  question: FormQuestion,
  answer?: FormAnswer,
): string | undefined {
  const text = answerText(answer).trim();
  if (!text)
    return question.required
      ? "Please answer this question to continue."
      : undefined;
  if (question.type === "url") {
    try {
      if (!["https:", "http:"].includes(new URL(text).protocol))
        throw new Error();
    } catch {
      return "Enter a complete website URL, such as https://example.com.";
    }
  }
  if (
    question.type === "file" &&
    Array.isArray(answer) &&
    answer.some(
      (file) => typeof file !== "string" && file.size > FORM_FILE_LIMIT,
    )
  )
    return "Each file must be 25 MB or smaller.";
  return undefined;
}
export function nextFormQuestion(
  questions: FormQuestion[],
  current: FormQuestion,
  answer?: FormAnswer,
): FormQuestion | undefined {
  const index = questions.findIndex((q) => q.id === current.id);
  const jump = current.rules.find(
    (rule) =>
      rule.action === "jump" &&
      ruleMatches(rule, answer) &&
      questions.slice(index + 1).some((q) => q.id === rule.target),
  );
  return jump
    ? questions.find((q) => q.id === jump.target)
    : questions[index + 1];
}
