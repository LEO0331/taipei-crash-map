import type { Language } from '../i18n';

type Props = {
  language: Language;
  onChange: (language: Language) => void;
};

export function LanguageToggle({ language, onChange }: Props) {
  return (
    <div className="segmented" aria-label="Language">
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
