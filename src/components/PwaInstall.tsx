import clsx from 'clsx';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { themeClasses } from '../constants/theme';
import {
  dismissIosInstallHint,
  isIosInstallDismissed,
  isIosSafari,
  isStandaloneMode,
} from '../utils/pwa';

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  if (isStandaloneMode() || !installPrompt) {
    return null;
  }

  const handleInstall = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <button
      type="button"
      onClick={() => void handleInstall()}
      className={themeClasses.themeToggle}
      aria-label="Install app"
      title="Install app"
    >
      <Download size={18} />
    </button>
  );
}

export function PwaIosInstallHint() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (
      isStandaloneMode() ||
      isIosInstallDismissed() ||
      !isIosSafari() ||
      !window.matchMedia('(display-mode: browser)').matches
    ) {
      setShowHint(false);
      return;
    }

    setShowHint(true);
  }, []);

  if (!showHint) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex max-w-full items-start gap-2 rounded-xl border border-border bg-surface-soft px-2.5 py-2',
        'text-[11px] leading-snug text-muted sm:text-xs',
      )}
    >
      <p className="min-w-0 flex-1">
        To install the app: Share → Add to Home Screen
      </p>
      <button
        type="button"
        onClick={() => {
          dismissIosInstallHint();
          setShowHint(false);
        }}
        className="shrink-0 rounded-full p-0.5 text-muted transition hover:bg-surface hover:text-foreground"
        aria-label="Dismiss install hint"
      >
        <X size={14} />
      </button>
    </div>
  );
}
