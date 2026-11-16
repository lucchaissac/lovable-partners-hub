import {EditorWidgetToolbar} from './EditorWidgetToolbar';
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Dropdown,
  Icon,
  Input,
  Radio,
  RadioGroup,
  Switch,
  Textarea,
} from "@asset/ui";
import { ContactSelect } from "./ContactCardDesign";
import {
  FORM_TYPES,
  FORM_OPERATORS,
  SAMPLE_FORM,
  FORM_FILE_LIMIT,
  answerText,
  newFormQuestion,
  nextFormQuestion,
  validateFormAnswer,
  visibleFormQuestions,
  type EditorFormValue,
  type FormAnswer,
  type FormAnswers,
  type FormQuestion,
  type FormQuestionType,
  type FormResponse,
} from "./formModels";
import "./editor-form.css";
export { SAMPLE_FORM, EMPTY_FORM } from "./formModels";
export type { EditorFormValue } from "./formModels";

function AnswerField({
  question,
  answer,
  onChange,
  invalid,
  describedBy,
}: {
  question: FormQuestion;
  answer?: FormAnswer;
  onChange: (answer: FormAnswer) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null),
    id = useId();
  const props = {
    "aria-label": question.label || "Answer",
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  };
  if (question.type === "checkboxes")
    return (
      <div className="efm-options" role="group" {...props}>
        {question.options.map((option) => (
          <label key={option}>
            <Checkbox
              ariaLabel={option}
              tabIndex={0}
              state={
                Array.isArray(answer) && answer.some((item) => item === option)
                  ? "on"
                  : "off"
              }
              onToggle={() => {
                const values = Array.isArray(answer)
                  ? answer.filter(
                      (item): item is string => typeof item === "string",
                    )
                  : [];
                onChange(
                  values.includes(option)
                    ? values.filter((item) => item !== option)
                    : [...values, option],
                );
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  if (question.type === "choice")
    return (
      <RadioGroup
        {...props}
        className="efm-options"
        value={typeof answer === "string" ? answer : ""}
        onChange={onChange}
      >
        {question.options.map((option) => (
          <Radio key={option} value={option}>
            {option}
          </Radio>
        ))}
      </RadioGroup>
    );
  if (question.type === "dropdown")
    return (
      <div {...props}>
        <ContactSelect
          label={question.label || "Choose an answer"}
          value={typeof answer === "string" ? answer : ""}
          options={[
            { id: "", label: "Choose an option" },
            ...question.options.map((option) => ({
              id: option,
              label: option,
            })),
          ]}
          onChange={onChange}
        />
      </div>
    );
  if (question.type === "file") {
    const files = Array.isArray(answer)
      ? answer.filter(
          (item): item is { name: string; size: number } =>
            typeof item !== "string",
        )
      : [];
    const choose = (list: FileList | null) => {
      if (list)
        onChange(
          Array.from(list).map((file) => ({
            name: file.name,
            size: file.size,
          })),
        );
    };
    return (
      <div className="efm-files" {...props}>
        <div
          className="efm-drop"
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            choose(event.dataTransfer.files);
          }}
        >
          <Icon name="upload" size={24} />
          <p>Drag and drop your files here or browse</p>
          <span>Size limit: 25 MB per file · local preview only</span>
          <input
            ref={fileInput}
            id={id}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              choose(event.target.files);
              event.target.value = "";
            }}
          />
          <Button variant="neutral" onClick={() => fileInput.current?.click()}>
            Browse files
          </Button>
        </div>
        {files.map((file, index) => (
          <div className="efm-file" key={`${file.name}-${index}`}>
            <Icon name="file" size={16} />
            <span>
              {file.name}
              {file.size > FORM_FILE_LIMIT ? " · Too large" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove ${file.name}`}
              leadingIcon={<Icon name="x" size={14} />}
              onClick={() => onChange(files.filter((_, i) => i !== index))}
            />
          </div>
        ))}
      </div>
    );
  }
  if (question.type === "paragraph")
    return (
      <Textarea
        {...props}
        rows={4}
        value={typeof answer === "string" ? answer : ""}
        placeholder="Write your answer…"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  return (
    <Input
      {...props}
      type={question.type === "url" ? "url" : "text"}
      value={typeof answer === "string" ? answer : ""}
      placeholder={question.type === "url" ? "https://" : "Write your answer…"}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
function FormRunner({
  value,
  onSubmit,
}: {
  value: EditorFormValue;
  onSubmit: (response: FormResponse) => void;
}) {
  const [answers, setAnswers] = useState<FormAnswers>({}),
    [step, setStep] = useState<string | null>(null),
    [started, setStarted] = useState(!value.intro),
    [complete, setComplete] = useState(false),
    [error, setError] = useState<string>(),
    [history, setHistory] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null),
    errorId = useId();
  const visible = visibleFormQuestions(value, answers),
    question = visible.find((q) => q.id === step) || visible[0],
    index = visible.findIndex((q) => q.id === question?.id);
  useEffect(() => {
    if (started) heading.current?.focus();
  }, [step, started, complete]);
  const restart = () => {
    setAnswers({});
    setStep(null);
    setError(undefined);
    setHistory([]);
    setComplete(false);
    setStarted(!value.intro);
  };
  const finish = (visited: string[]) => {
    // A deliberate jump skips intervening questions, including their required checks.
    const included = visible.filter((q) => visited.includes(q.id));
    const invalid = included.find((q) => validateFormAnswer(q, answers[q.id]));
    if (invalid) {
      setStep(invalid.id);
      setError(validateFormAnswer(invalid, answers[invalid.id]));
      return;
    }
    onSubmit({
      id: crypto.randomUUID(),
      submittedAt: new Date().toLocaleString(),
      answers: included.map((q) => ({
        label: q.label || "Untitled question",
        value: answerText(answers[q.id]) || "—",
      })),
    });
    setComplete(true);
  };
  const advance = () => {
    if (!question) return;
    const issue = validateFormAnswer(question, answers[question.id]);
    if (issue) {
      setError(issue);
      return;
    }
    setError(undefined);
    const next = nextFormQuestion(visible, question, answers[question.id]);
    if (next) {
      setHistory([...history, question.id]);
      setStep(next.id);
    } else finish([...history, question.id]);
  };
  const next =
    question && nextFormQuestion(visible, question, answers[question.id]);
  return (
    <div className="efm-runner">
      {complete ? (
        <div className="efm-intro">
          <span className="efm-success">
            <Icon name="check" size={24} />
          </span>
          <h2 ref={heading} tabIndex={-1}>
            {value.ending || "Thanks for your answers."}
          </h2>
          <p>Your demo response is ready in Show responses.</p>
          {value.answerAgain && (
            <Button variant="neutral" onClick={restart}>
              Answer again
            </Button>
          )}
        </div>
      ) : !value.questions.length ? (
        <div className="efm-intro">
          <Icon name="clipboard-list" size={32} />
          <h2>No questions yet</h2>
          <p>Edit the form to add your first question.</p>
        </div>
      ) : !started ? (
        <div className="efm-intro">
          <h2>{value.title || "Untitled form"}</h2>
          <p>{value.description}</p>
          <Button
            variant="primary"
            onClick={() => setStarted(true)}
            trailingIcon={<Icon name="arrow-right" size={16} />}
          >
            Start
          </Button>
          <small>{visible.length} questions</small>
        </div>
      ) : !question ? (
        <div className="efm-intro">
          <h2>No visible questions</h2>
          <p>Show a question in the form editor to preview it.</p>
        </div>
      ) : (
        <form
          className="efm-question"
          onKeyDown={(event) => {
            // Studio previews block native form submissions. Keep the local
            // question flow working without allowing external form actions.
            if (event.key === "Enter" && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              advance();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            advance();
          }}
          noValidate
        >
          <div className="efm-question-copy">
            <small>
              Question {index + 1} of {visible.length}
            </small>
            <h2 ref={heading} tabIndex={-1}>
              {question.label || "Untitled question"}
              {question.required && <span aria-label="Required"> *</span>}
            </h2>
            {question.description && <p>{question.description}</p>}
          </div>
          <AnswerField
            key={question.id}
            question={question}
            answer={answers[question.id]}
            invalid={!!error}
            describedBy={error ? errorId : undefined}
            onChange={(answer) => {
              setAnswers({ ...answers, [question.id]: answer });
              setError(undefined);
            }}
          />
          {error && (
            <p id={errorId} className="efm-error" role="alert">
              {error}
            </p>
          )}
          <div className="efm-runner-nav">
            <Button
              variant="neutral"
              aria-label="Previous question"
              disabled={!history.length}
              leadingIcon={<Icon name="arrow-left" size={16} />}
              onClick={() => {
                setStep(history.at(-1)!);
                setHistory(history.slice(0, -1));
                setError(undefined);
              }}
            />
            <span>
              {index + 1} / {visible.length}
            </span>
            <Button
              variant="primary"
              type="button"
              onClick={advance}
              trailingIcon={
                <Icon name={next ? "arrow-right" : "check"} size={16} />
              }
            >
              {next ? "Continue" : "Submit demo response"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FormEditor({
  value,
  onSave,
  onClose,
}: {
  value: EditorFormValue;
  onSave: (value: EditorFormValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(value)),
    [selected, setSelected] = useState("intro");
  const question = draft.questions.find((q) => q.id === selected),
    index = draft.questions.findIndex((q) => q.id === selected);
  const patch = (next: Partial<EditorFormValue>) =>
    setDraft({ ...draft, ...next });
  const change = (next: Partial<FormQuestion>) =>
    patch({
      questions: draft.questions.map((q) =>
        q.id === selected ? { ...q, ...next } : q,
      ),
    });
  const add = (type: string) => {
    const q = newFormQuestion(type as FormQuestionType);
    patch({ questions: [...draft.questions, q] });
    setSelected(q.id);
  };
  const move = (offset: number) => {
    const questions = [...draft.questions];
    [questions[index], questions[index + offset]] = [
      questions[index + offset],
      questions[index],
    ];
    const positions = new Map(questions.map((q, i) => [q.id, i]));
    patch({
      questions: questions.map((q, i) => ({
        ...q,
        rules: q.rules.filter((rule) => (positions.get(rule.target) ?? -1) > i),
      })),
    });
  };
  const valid = draft.questions.every(
    (q) =>
      !!q.label.trim() &&
      (!["checkboxes", "dropdown", "choice"].includes(q.type) ||
        (q.options.length > 0 &&
          q.options.every((option) => option.trim()) &&
          new Set(q.options).size === q.options.length)) &&
      q.rules.every(
        (rule) =>
          !!rule.target &&
          (["known", "unknown"].includes(rule.operator) || !!rule.value.trim()),
      ),
  );
  return createPortal(
    <Dialog
      open
      onClose={onClose}
      width={1120}
      ariaLabel="Edit form"
      className="efm-editor-dialog"
      dividers
    >
      <DialogHeader title="Edit form" onClose={onClose} />
      <DialogBody className="efm-editor-body">
        <nav className="efm-outline" aria-label="Form content">
          <strong>Content</strong>
          <Button
            variant="ghost"
            active={selected === "intro"}
            onClick={() => setSelected("intro")}
          >
            Title & description
          </Button>
          {draft.questions.map((q, i) => (
            <Button
              key={q.id}
              variant="ghost"
              active={selected === q.id}
              onClick={() => setSelected(q.id)}
            >
              <span>
                {i + 1}. {q.label || "Untitled question"}
              </span>
            </Button>
          ))}
          <Dropdown
            items={FORM_TYPES.map((type) => ({
              id: type.id,
              label: type.label,
            }))}
            onChange={add}
            listHeight="auto"
            trigger={
              <Button
                variant="neutral"
                leadingIcon={<Icon name="plus" size={16} />}
              >
                Add question
              </Button>
            }
          />
          <Button
            variant="ghost"
            active={selected === "ending"}
            onClick={() => setSelected("ending")}
          >
            End note
          </Button>
        </nav>
        <div className="efm-editor-fields">
          {selected === "intro" ? (
            <>
              <label>
                Title
                <Input
                  value={draft.title}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </label>
              <label>
                Description
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(event) =>
                    patch({ description: event.target.value })
                  }
                />
              </label>
              <label className="efm-setting">
                Show introduction
                <Switch
                  checked={draft.intro}
                  onChange={(intro) => patch({ intro })}
                />
              </label>
            </>
          ) : selected === "ending" ? (
            <>
              <label>
                End note
                <Input
                  value={draft.ending}
                  onChange={(event) => patch({ ending: event.target.value })}
                />
              </label>
              <label className="efm-setting">
                Answer again
                <Switch
                  checked={draft.answerAgain}
                  onChange={(answerAgain) => patch({ answerAgain })}
                />
              </label>
            </>
          ) : (
            question && (
              <>
                <div className="efm-editor-question-head">
                  <span>
                    {
                      FORM_TYPES.find((type) => type.id === question.type)
                        ?.label
                    }
                  </span>
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Move question up"
                      disabled={index === 0}
                      onClick={() => move(-1)}
                      leadingIcon={<Icon name="arrow-up" size={16} />}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Move question down"
                      disabled={index === draft.questions.length - 1}
                      onClick={() => move(1)}
                      leadingIcon={<Icon name="arrow-down" size={16} />}
                    />
                  </div>
                </div>
                <label>
                  Question
                  <Input
                    value={question.label}
                    placeholder="Write your question here…"
                    onChange={(event) => change({ label: event.target.value })}
                  />
                </label>
                <label>
                  Description
                  <Textarea
                    value={question.description}
                    onChange={(event) =>
                      change({ description: event.target.value })
                    }
                  />
                </label>
                <div className="efm-settings">
                  <label className="efm-setting">
                    Show
                    <Switch
                      checked={question.visible}
                      onChange={(visible) => change({ visible })}
                    />
                  </label>
                  <label className="efm-setting">
                    Required
                    <Switch
                      checked={question.required}
                      onChange={(required) => change({ required })}
                    />
                  </label>
                </div>
                {["checkboxes", "dropdown", "choice"].includes(
                  question.type,
                ) && (
                  <div className="efm-edit-options">
                    <strong>Answer options</strong>
                    {question.options.map((option, i) => (
                      <div key={i}>
                        <Input
                          aria-label={`Option ${i + 1}`}
                          value={option}
                          onChange={(event) =>
                            change({
                              options: question.options.map((item, n) =>
                                n === i ? event.target.value : item,
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          aria-label={`Remove option ${i + 1}`}
                          onClick={() =>
                            change({
                              options: question.options.filter(
                                (_, n) => n !== i,
                              ),
                            })
                          }
                          leadingIcon={<Icon name="x" size={16} />}
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      leadingIcon={<Icon name="plus" size={16} />}
                      onClick={() =>
                        change({
                          options: [
                            ...question.options,
                            `Option ${question.options.length + 1}`,
                          ],
                        })
                      }
                    >
                      Add option
                    </Button>
                  </div>
                )}
                <div className="efm-rules">
                  <strong>Rules</strong>
                  {question.rules.map((rule) => (
                    <div className="efm-rule" key={rule.id}>
                      <span>When this answer</span>
                      <ContactSelect
                        label="Rule operator"
                        value={rule.operator}
                        options={[...FORM_OPERATORS]}
                        onChange={(operator) =>
                          change({
                            rules: question.rules.map((r) =>
                              r.id === rule.id
                                ? {
                                    ...r,
                                    operator: operator as typeof rule.operator,
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                      {!["known", "unknown"].includes(rule.operator) && (
                        <Input
                          aria-label="Rule answer"
                          value={rule.value}
                          placeholder="Answer…"
                          onChange={(event) =>
                            change({
                              rules: question.rules.map((r) =>
                                r.id === rule.id
                                  ? { ...r, value: event.target.value }
                                  : r,
                              ),
                            })
                          }
                        />
                      )}
                      <ContactSelect
                        label="Rule action"
                        value={rule.action}
                        options={["hide", "jump", "show"].map((id) => ({
                          id,
                          label: id[0].toUpperCase() + id.slice(1),
                        }))}
                        onChange={(action) =>
                          change({
                            rules: question.rules.map((r) =>
                              r.id === rule.id
                                ? { ...r, action: action as typeof rule.action }
                                : r,
                            ),
                          })
                        }
                      />
                      <ContactSelect
                        label="Target question"
                        value={rule.target}
                        options={[
                          { id: "", label: "Choose a question" },
                          ...draft.questions
                            .slice(index + 1)
                            .map((q) => ({
                              id: q.id,
                              label: q.label || "Untitled question",
                            })),
                        ]}
                        onChange={(target) =>
                          change({
                            rules: question.rules.map((r) =>
                              r.id === rule.id ? { ...r, target } : r,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        aria-label="Remove rule"
                        leadingIcon={<Icon name="trash-2" size={16} />}
                        onClick={() =>
                          change({
                            rules: question.rules.filter(
                              (r) => r.id !== rule.id,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button
                    variant="neutral"
                    disabled={index === draft.questions.length - 1}
                    leadingIcon={<Icon name="plus" size={16} />}
                    onClick={() =>
                      change({
                        rules: [
                          ...question.rules,
                          {
                            id: crypto.randomUUID(),
                            operator: "is",
                            value: "",
                            action: "show",
                            target: "",
                          },
                        ],
                      })
                    }
                  >
                    Add rule
                  </Button>
                </div>
                <div className="efm-editor-question-head">
                  <Button
                    variant="neutral"
                    onClick={() => {
                      const q = {
                        ...structuredClone(question),
                        id: crypto.randomUUID(),
                        label: `${question.label} (copy)`,
                        rules: [],
                      };
                      patch({
                        questions: [
                          ...draft.questions.slice(0, index + 1),
                          q,
                          ...draft.questions.slice(index + 1),
                        ],
                      });
                      setSelected(q.id);
                    }}
                  >
                    Duplicate question
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      patch({
                        questions: draft.questions
                          .filter((q) => q.id !== question.id)
                          .map((q) => ({
                            ...q,
                            rules: q.rules.filter(
                              (rule) => rule.target !== question.id,
                            ),
                          })),
                      });
                      setSelected("intro");
                    }}
                    leadingIcon={<Icon name="trash-2" size={16} />}
                  >
                    Remove question
                  </Button>
                </div>
              </>
            )
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <span className="efm-editor-note">
          {valid
            ? "Local demo · changes restart the preview"
            : "Add question labels, unique options and complete rules to save."}
        </span>
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => onSave(draft)}
        >
          Save changes
        </Button>
      </DialogFooter>
    </Dialog>,
    document.body,
  );
}

export function EditorForm({
  value,
  onChange,
}: {
  value: EditorFormValue;
  onChange: (value: EditorFormValue) => void;
}) {
  const [editor, setEditor] = useState(false),
    [results, setResults] = useState(false),
    [responses, setResponses] = useState<FormResponse[]>([]),
    [revision, setRevision] = useState(0);
  return (
    <section className="efm-root" aria-label="Forms widget">
      <EditorWidgetToolbar className="efm-toolbar">
        <Dropdown
          listHeight="auto"
          items={[
            {
              id: "edit",
              label: "Edit form",
              leadingIcon: <Icon name="pencil" size={16} />,
            },
            {
              id: "example",
              label: "Load example form",
              disabled: !!value.questions.length,
            },
          ]}
          onChange={(id) => {
            if (id === "edit") setEditor(true);
            else {
              onChange(structuredClone(SAMPLE_FORM));
              setRevision((n) => n + 1);
            }
          }}
          trigger={
            <Button
              variant="ghost"
              aria-label="Form options"
              leadingIcon={<Icon name="ellipsis" size={18} />}
            />
          }
        />
        <Button variant="neutral" onClick={() => setResults(true)}>
          Show responses{responses.length ? ` (${responses.length})` : ""}
        </Button>
      </EditorWidgetToolbar>
      <FormRunner
        key={revision}
        value={value}
        onSubmit={(response) =>
          setResponses((previous) => [...previous, response])
        }
      />
      {editor && (
        <FormEditor
          value={value}
          onClose={() => setEditor(false)}
          onSave={(next) => {
            onChange(next);
            setRevision((n) => n + 1);
            setEditor(false);
          }}
        />
      )}
      {results &&
        createPortal(
          <Dialog
            open
            onClose={() => setResults(false)}
            width={760}
            ariaLabel="Form responses"
            dividers
          >
            <DialogHeader
              title={`Responses · ${responses.length}`}
              onClose={() => setResults(false)}
            />
            <DialogBody>
              <p className="efm-editor-note">
                Responses from this local demo only. Refreshing clears them.
              </p>
              {responses.length ? (
                responses.map((response, i) => (
                  <article className="efm-response" key={response.id}>
                    <h3>Response {i + 1}</h3>
                    <small>{response.submittedAt}</small>
                    <dl>
                      {response.answers.map((answer, n) => (
                        <div key={n}>
                          <dt>{answer.label}</dt>
                          <dd>{answer.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))
              ) : (
                <div className="efm-empty">
                  <Icon name="inbox" size={32} />
                  <h3>No responses yet</h3>
                  <p>Complete the preview to see your answers here.</p>
                </div>
              )}
            </DialogBody>
          </Dialog>,
          document.body,
        )}
    </section>
  );
}
