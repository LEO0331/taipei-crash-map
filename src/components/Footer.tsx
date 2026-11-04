import type { Translation } from '../i18n';
import { DisclaimerNotice } from './DisclaimerNotice';

export function Footer({ t, showDisclaimer }: { t: Translation; showDisclaimer?: boolean }) {
  return (
    <footer className="footer">
      {showDisclaimer ? <DisclaimerNotice t={t} /> : null}
      <p>{t.footer}</p>
      <p><a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`}>Third-party notices / 第三方授權聲明</a></p>
    </footer>
  );
}
