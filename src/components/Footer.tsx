import type { Translation } from '../i18n';

export function Footer({ t }: { t: Translation }) {
  return <footer className="footer">{t.footer}</footer>;
}
