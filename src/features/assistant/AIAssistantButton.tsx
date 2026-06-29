import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { AIAssistantPanel } from './AIAssistantPanel';

export function AIAssistantButton() {
  const isAssistantOpen = useUIStore((s) => s.isAssistantOpen);
  const openAssistant = useUIStore((s) => s.openAssistant);
  const closeAssistant = useUIStore((s) => s.closeAssistant);

  return (
    <>
      <button
        type="button"
        onClick={() => (isAssistantOpen ? closeAssistant() : openAssistant())}
        className={clsx(
          'fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-strong sm:right-6',
          isAssistantOpen && 'ring-4 ring-primary-soft',
        )}
        aria-label={isAssistantOpen ? 'Close planning assistant' : 'Open planning assistant'}
        aria-expanded={isAssistantOpen}
      >
        <Sparkles size={22} />
      </button>

      {isAssistantOpen && <AIAssistantPanel />}
    </>
  );
}
