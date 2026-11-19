import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Badge, Button, Icon, ReasoningBlock } from '@asset/ui';
import { capturedTurn, type CapturedHumanRequest, type CapturedTurn, type CapturedWidget } from './stagingChats';
import { ChatMarkdown } from '../../../components/ChatMarkdown';
import './editor-chat-transcript.css';

/** Review the original questions and saved selections without rewriting history. */
function HumanRequest({ request }: { request: CapturedHumanRequest }) {
  const [step, setStep] = useState(0);
  const question = request.questions[step];
  const titleId = useId();
  return <details className="we-human-request">
    <summary><Icon name="message-square" size={14} /><span>{request.title}</span><Icon className="we-transcript-chevron" name="chevron-down" size={12} /></summary>
    <div className="we-human-request-body">
      <div className="we-transcript-meta"><Badge variant="soft" tone="success" size="sm">Answered</Badge><span>{step + 1} of {request.questions.length}</span></div>
      <div aria-live="polite" aria-atomic="true"><strong id={titleId}>{question.prompt}</strong>{question.description && <p className="we-transcript-muted">{question.description}</p>}</div>
      <ul className="we-human-request-options" aria-labelledby={titleId}>{(question.options.length ? question.options : [question.answer]).map(option => <li key={option} data-selected={option === question.answer || undefined} aria-label={option === question.answer ? `${option} — Selected answer` : option}>
        <Icon name={option === question.answer ? 'circle-check' : 'circle'} size={14} /><span>{option}</span>
      </li>)}</ul>
      <div className="we-human-request-actions"><Button size="md" variant="neutral" disabled={!step} onClick={() => setStep(value => value - 1)}>Back</Button>
        <Button size="md" variant="neutral" disabled={step === request.questions.length - 1} onClick={() => setStep(value => value + 1)}>Next</Button>
      </div>
    </div>
  </details>;
}

function WidgetRequest({ widget }: { widget: CapturedWidget }) {
  return <details className="we-widget-request">
    <summary><Icon name="app-window" size={14} /><span>{widget.request}</span><Icon className="we-transcript-chevron" name="chevron-down" size={12} /></summary>
    <div className="we-widget-request-body">
      <div className="we-transcript-meta"><strong>{widget.title}</strong><Badge variant="soft" size="sm">{widget.inputCount}</Badge></div>
      <p>{widget.description}</p>
      <div className="we-widget-request-preview"><strong>{widget.heading}</strong><span><Icon name="search" size={14} />{widget.input}</span></div>
      <div className="we-widget-decision"><Icon name="check" size={16} /><span>{widget.decision}</span><Badge variant="soft" tone="success" size="sm">Approved</Badge></div>
    </div>
  </details>;
}

export function EditorChatTranscript({ turn }: { turn: CapturedTurn }) {
  return <>
    {!!turn.activities.length && <ReasoningBlock className="we-chat-activity" label="Activity" icon={null}>
      <ul className="we-chat-activity-list">{turn.activities.map((activity, index) => <li key={index}><span>{activity.label}</span>{activity.detail && <small>{activity.detail}</small>}</li>)}</ul>
    </ReasoningBlock>}
    {turn.body.map((block, index) => block.type === 'paragraph' ? <p key={index}>{block.text}</p>
      : block.type === 'list' ? block.ordered ? <ol key={index}>{block.items.map(item => <li key={item}>{item}</li>)}</ol> : <ul key={index}>{block.items.map(item => <li key={item}>{item}</li>)}</ul>
      : block.type === 'human-request' ? <HumanRequest key={index} request={block} /> : <WidgetRequest key={index} widget={block} />)}
  </>;
}

export function CapturedChatReply({ sourceTurnId }: { sourceTurnId: string }) {
  const turn = capturedTurn(sourceTurnId);
  return turn ? <EditorChatTranscript turn={turn} /> : null;
}

/** Keep the source transcript intact while allowing concise demo copy. */
export function EditorChatUserText({ text, sourceTurnId }: { text: string; sourceTurnId?: string }) {
  const turn = capturedTurn(sourceTurnId);
  const displayText = turn?.text === text ? turn.displayText ?? text : text;
  const contentRef = useRef<HTMLDivElement>(null);
  const [singleLine, setSingleLine] = useState(false);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const bubble = content.closest<HTMLElement>('.ui-msg-bubble')!;
    const container = content.closest<HTMLElement>('.we-chat-turn');
    let active = true;
    const measure = () => {
      if (!active) return;
      bubble.style.width = '';
      const paragraph = content.firstElementChild;
      const styles = getComputedStyle(content);
      const lineHeight = Number.parseFloat(styles.lineHeight);
      const row = content.closest<HTMLElement>('.ui-msg')!;
      const maxWidth = getComputedStyle(row).maxWidth;
      const availableWidth = maxWidth.endsWith('%')
        ? Number.parseFloat(maxWidth) / 100 * row.parentElement!.clientWidth
        : Number.parseFloat(maxWidth);
      const pillInset = 2 * Number.parseFloat(styles.getPropertyValue('--ui-space-4'));
      const textRange = document.createRange();
      textRange.selectNodeContents(content);
      // Check against the wider pill padding before changing it, avoiding wrap/unwrap loops.
      setSingleLine(content.children.length === 1 && paragraph?.tagName === 'P'
        && content.getBoundingClientRect().height <= lineHeight + 1
        && textRange.getBoundingClientRect().width <= availableWidth - pillInset + 1);
      // Hug the longest rendered line, including wrapped text. Leave attachments
      // and structured messages to their existing layouts.
      if (bubble.children.length === 1 && [...content.children].every(child => child.tagName === 'P')) {
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const left = content.getBoundingClientRect().left;
        let width = 0;
        while (walker.nextNode()) {
          textRange.selectNodeContents(walker.currentNode);
          for (const rect of textRange.getClientRects()) width = Math.max(width, rect.right - left);
        }
        const inset = getComputedStyle(bubble);
        if (width) bubble.style.width = `${Math.ceil(width + parseFloat(inset.paddingLeft) + parseFloat(inset.paddingRight) + 1)}px`;
      }
    };
    measure();
    let previousWidth = container?.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container?.clientWidth === previousWidth) return;
      previousWidth = container?.clientWidth;
      measure();
    });
    if (container) observer.observe(container);
    document.fonts.ready.then(measure);
    return () => { active = false; observer.disconnect(); bubble.style.width = ''; };
  }, [displayText, singleLine]);
  return <div ref={contentRef} className="we-user-message" data-single-line={singleLine || undefined}>
    <ChatMarkdown text={displayText} preserveLineBreaks links />
  </div>;
}
