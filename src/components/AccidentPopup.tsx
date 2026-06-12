import type { AccidentRecord } from '../types/accident';
import type { Language, Translation } from '../i18n';
import { getGoogleMapsUrl } from '../utils/accidents';

type Props = {
  accident: AccidentRecord;
  language: Language;
  t: Translation;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderAccidentPopup({ accident, language, t }: Props): string {
  const typeLabel =
    language === 'zh' ? accident.accidentTypeLabelZh : accident.accidentTypeLabelEn;
  const mapsUrl = getGoogleMapsUrl(accident.latitude, accident.longitude);
  return `
    <div class="popup">
      <strong>${escapeHtml(typeLabel)}</strong>
      <p>${escapeHtml(accident.accidentTime)}</p>
      <p>${escapeHtml(accident.district ?? '-')}</p>
      <p>${escapeHtml(accident.location)}</p>
      <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t.openGoogleMaps)}</a>
    </div>
  `;
}
