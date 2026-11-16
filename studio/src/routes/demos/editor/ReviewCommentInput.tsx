import { forwardRef, type TextareaHTMLAttributes } from 'react';
import './review-comment-input.css';
import { CommentMentionInput, type CommentMember } from '../../../components/CommentMentions';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { mention?: string; members?: CommentMember[]; onValueChange?: (value: string) => void };

/** Shared input for comments pinned to a page or attached to a shape. */
export const ReviewCommentInput = forwardRef<HTMLTextAreaElement, Props>(function ReviewCommentInput(
  { mention, members, onValueChange, rows = 3, ...props }, ref,
) {
  if (members) return <div className="we-review-comment-input"><CommentMentionInput {...props} rows={rows} mention={mention} members={members} value={String(props.value ?? '')} onChange={value => onValueChange?.(value)} /></div>;
  return <div className="we-review-comment-input">
    {mention && <span className="we-review-comment-mention">{mention}</span>}
    <textarea ref={ref} rows={rows} {...props} />
  </div>;
});
