import { useRef } from 'react';
import { X } from 'lucide-react';
import { DOCUMENTS, type DocumentId } from '../data/case';
import { ActionButton } from './Ui';
import { DocumentPage } from './DocumentPage';
import { useDialogFocus } from './useDialogFocus';

/** A dialogue handoff is a single official paper, never the case-file navigation. */
export function DocumentReader({ id, onClose }: { id: DocumentId; onClose: (source: HTMLElement | null) => void }) {
  const dialog = useRef<HTMLElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const close = () => onClose(paper.current);
  const onKeyDown = useDialogFocus(dialog, close);
  return <div className="rd-modal rd-reader-backdrop" dir="rtl"><section className="rd-document-reader" ref={dialog} role="dialog" aria-modal="true" aria-label={DOCUMENTS[id].title} data-testid="document-reader" onKeyDown={onKeyDown}>
    <ActionButton variant="secondary" className="rd-reader-close" aria-label="إغلاق المستند" onClick={close}><X/></ActionButton>
    <div className="rd-reader-paper" ref={paper}><DocumentPage id={id}/></div>
  </section></div>;
}