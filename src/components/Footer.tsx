import type { Translation } from '../i18n';
import { DisclaimerNotice } from './DisclaimerNotice';

export function Footer({ t, showDisclaimer }: { t: Translation; showDisclaimer?: boolean }) {
  return (
    <footer className="footer">
      {showDisclaimer ? <DisclaimerNotice t={t} /> : null}
      <p>{t.footer}</p>
    </footer>
  );
}
