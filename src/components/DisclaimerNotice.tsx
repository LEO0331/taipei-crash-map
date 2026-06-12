import type { Translation } from '../i18n';

export function DisclaimerNotice({ t }: { t: Translation }) {
  return <p className="notice">{t.dataDisclaimer}</p>;
}
