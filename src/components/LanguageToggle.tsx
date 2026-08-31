import type { Language, Translation } from '../i18n';

type Props = {
  language: Language;
  t: Translation;
  onChange: (language: Language) => void;
};

export function LanguageToggle({ language, t, onChange }: Props) {
  return (
    <div className="segmented" aria-label={t.language}>
      <button
        className={language === 'zh' ? 'active' : ''}
        type="button"
        aria-pressed={language === 'zh'}
        onClick={() => onChange('zh')}
      >
        中文
      </button>
      <button
        className={language === 'en' ? 'active' : ''}
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
}
