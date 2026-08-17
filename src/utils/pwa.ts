export function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosSafari(): boolean {
  const { userAgent } = window.navigator;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari =
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isSafari;
}
