import clsx from 'clsx';
import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { themeClasses } from '../constants/theme';
import { getPwaLanguage, pwaT } from '../features/pwa/pwaCopy';
import { isIosSafari, isStandaloneMode } from '../utils/pwa';

const installButtonClassName = clsx(
  'inline-flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface',
  'px-2 py-1.5 text-xs font-medium text-muted transition',
  'hover:bg-surface-soft hover:text-foreground',
  'focus:outline-none focus:ring-2 focus:ring-primary-soft',
);

export function PwaInstallButton() {
  const lang = getPwaLanguage();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const canInstallOnChromium = installPrompt !== null;
  const canInstallOnIos =
    isIosSafari() && !isStandaloneMode() && !canInstallOnChromium;
  const showButton =
    !installed &&
    !isStandaloneMode() &&
    (canInstallOnChromium || canInstallOnIos);

  if (!showButton) {
    return null;
  }

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      return;
    }

    if (canInstallOnIos) {
      setIosInstructionsOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className={installButtonClassName}
        aria-label={pwaT(lang, 'installApp')}
        title={pwaT(lang, 'installApp')}
      >
        <Download size={14} aria-hidden="true" />
        <span className="hidden min-[380px]:inline">{pwaT(lang, 'installApp')}</span>
      </button>

      {iosInstructionsOpen && (
        <IosInstallInstructions
          lang={lang}
          onClose={() => setIosInstructionsOpen(false)}
        />
      )}
    </>
  );
}

function IosInstallInstructions({
  lang,
  onClose,
}: {
  lang: ReturnType<typeof getPwaLanguage>;
  onClose: () => void;
}) {
  const steps = [
    pwaT(lang, 'iosStepShare'),
    pwaT(lang, 'iosStepAddToHome'),
    pwaT(lang, 'iosStepAdd'),
  ];

  return (
    <Modal title={pwaT(lang, 'installTitle')} onClose={onClose}>
      <ol className="space-y-3 text-sm text-foreground">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-soft text-xs font-semibold text-primary-strong ring-1 ring-border">
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5 leading-snug">
              {index === 0 ? (
                <span className="inline-flex flex-wrap items-center gap-1">
                  {step}
                  <Share size={14} className="inline shrink-0 text-muted" aria-hidden="true" />
                </span>
              ) : (
                step
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className={clsx('w-full sm:w-auto', themeClasses.primaryBtn)}
        >
          {pwaT(lang, 'close')}
        </button>
      </div>
    </Modal>
  );
}
