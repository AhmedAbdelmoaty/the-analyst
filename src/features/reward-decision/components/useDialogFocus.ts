import { useEffect, type KeyboardEvent, type RefObject } from 'react';

export function useDialogFocus(ref: RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => { const previous=document.activeElement; ref.current?.querySelector<HTMLElement>('button')?.focus(); return () => { if(previous instanceof HTMLElement&&previous.isConnected)previous.focus(); }; }, [ref]);
  return (event: KeyboardEvent) => {
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
    if(event.key!=='Tab'||!ref.current)return;
    const items=[...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
}