import { Icon } from './Icon';
import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import type { ReactNode, KeyboardEvent, ChangeEvent, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSend?: (v: string) => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  pending?: boolean;
  /** Selected context shown above the input; does not make an empty message sendable. */
  context?: ReactNode;
  attachments?: ReactNode;
  /** Submit on Enter (Shift+Enter inserts newline). Default true. */
  submitOnEnter?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  maxRows?: number;
  /** Input accessibility and interactions, such as a teammate mention picker. */
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'placeholder' | 'className' | 'style' | 'rows'>;
  sendLabel?: string;
};

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value,
    onChange,
    onSend,
    onStop,
    placeholder = 'Message AI Agent…',
    disabled,
    pending,
    context,
    attachments,
    submitOnEnter = true,
    leading,
    trailing,
    className,
    maxRows = 8,
    textareaProps,
    sendLabel = 'Send',
  },
  ref,
) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLTextAreaElement);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineH = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const style = getComputedStyle(el);
    const max = lineH * maxRows + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [value, maxRows]);

  const submit = () => {
    const v = value.trim();
    if ((!v && !attachments) || disabled || pending) return;
    onSend?.(v);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    textareaProps?.onKeyDown?.(e);
    if (e.defaultPrevented || !submitOnEnter) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);

  const canSend = (value.trim().length > 0 || !!attachments) && !disabled && !pending;

  return (
    <div className={cn('ui-composer', className)} data-disabled={disabled ? '' : undefined}>
      {context}
      {attachments}
      <textarea
        {...textareaProps}
        ref={localRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        className="ui-composer-textarea"
      />
      <div className="ui-composer-actions">
        <div className="ui-composer-actions-leading">{leading}</div>
        <div className="ui-composer-actions-trailing">
          {trailing}
          <button
            type="button"
            className="ui-composer-send"
            onClick={pending && onStop ? onStop : submit}
            disabled={pending && onStop ? false : !canSend}
            data-pending={pending && !onStop ? '' : undefined}
            data-stopping={pending && onStop ? '' : undefined}
            aria-label={pending && onStop ? "Stop generation" : sendLabel}
          >
            {pending ? (
              <Icon name={onStop ? "square" : "loader-circle"} size={onStop ? 14 : 18} />
            ) : (
              <Icon name="arrow-up" size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

/** Keeps a selected composer control compact; its remove action replaces the icon on hover. */
export function ComposerSelection({ selected, removeLabel, onRemove, children }: {
  selected: boolean;
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return <div className="ui-composer-selection" data-selected={selected || undefined}>
    {children}
    {selected && <button type="button" className="ui-reset ui-composer-selection-remove" aria-label={removeLabel} onClick={onRemove}>
      <Icon name="x" size={12} />
    </button>}
  </div>;
}

/** A suggested prompt beneath a composer; selection fills the draft. */
export function ComposerSuggestion({ text, icon, onSelect }: { text: string; icon?: ReactNode; onSelect: (text: string) => void }) {
  return <button type="button" className="ui-composer-suggestion" onClick={() => onSelect(text)}><span className="ui-composer-suggestion-icon" aria-hidden="true">{icon ?? <Icon name="file-text" size={16} />}</span><span className="ui-composer-suggestion-label">{text}</span></button>;
}
