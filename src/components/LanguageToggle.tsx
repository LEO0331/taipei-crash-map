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
        onClick={() => onChange('zh')}
      >
        中文
      </button>
      <button
        className={language === 'en' ? 'active' : ''}
        type="button"
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
}
