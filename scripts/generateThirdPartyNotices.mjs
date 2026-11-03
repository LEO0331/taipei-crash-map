import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Include the complete non-development lockfile closure conservatively, even
// type-only/unused packages. This is an inventory, not a bundler reachability claim.
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isNotice = (name) => /(?:^|[-_.])(licen[cs]e|copying|notice)(?:[-_.]|$)/i.test(name);
const sections = [];
const inventory = [];

function append(title, file, source = file) {
  source = source.replaceAll('\\', '/');
  const bytes = readFileSync(file);
  if (!bytes.length) throw new Error(`Empty license: ${file}`);
  inventory.push({ title, source, bytes: bytes.length, sha256: hash(bytes) });
  sections.push(Buffer.from(`\n${'='.repeat(72)}\n${title}\nSource: ${source}\nSHA256: ${hash(bytes)}\n\n`), bytes, Buffer.from('\n'));
}

for (const [directory, entry] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  if (!directory || entry.dev || entry.link) continue;
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  if (manifest.version !== entry.version) throw new Error(`Installed version differs from lock: ${directory}`);
  const title = `${manifest.name}@${manifest.version} — declared license: ${manifest.license ?? 'not declared; see retained text'}`;
  const files = readdirSync(directory, { withFileTypes: true }).filter(file => file.isFile() && isNotice(file.name)).map(file => join(directory, file.name)).sort();
  if (!files.length && manifest.name !== 'victory-vendor') throw new Error(`No installed license found: ${directory}`);
  for (const file of files) append(title, file);
  if (manifest.name === 'victory-vendor') {
    if (manifest.version !== '37.3.6') throw new Error('Review upstream Victory wrapper license for new version');
    append(title, 'scripts/license-sources/victory-37.3.6-LICENSE.txt', 'https://raw.githubusercontent.com/FormidableLabs/victory/v37.3.6/LICENSE.txt (wrapper MIT text omitted from installed package)');
    for (const vendor of readdirSync(join(directory, 'lib-vendor')).sort()) {
      const folder = join(directory, 'lib-vendor', vendor);
      const notices = readdirSync(folder, { withFileTypes: true }).filter(file => file.isFile() && isNotice(file.name));
      if (!notices.length) throw new Error(`Missing embedded vendor license: ${folder}`);
      for (const file of notices) append(`${title}; embedded ${vendor}`, join(folder, file.name));
    }
  }
}
append('Civic Explorer adaptation — Portfolio v3.0.1 / LeoChen MIT notice', 'scripts/license-sources/LeoChen-CivicExplorer-MIT.txt');
const introduction = Buffer.from('THIRD-PARTY NOTICES — Taipei Crash Map\n\nComplete installed license/notice texts for the non-development package-lock closure, including conservatively retained type-only or unused packages and embedded Victory vendor notices. Source bytes appear unchanged below each SHA256 heading. The upstream version-specific Victory wrapper MIT notice and copied Civic Explorer notice are retained separately in source.\n\nThis inventory includes Hippocratic-2.1 (react-leaflet and @react-leaflet/core), MIT, ISC, BSD and composite declarations. Inclusion preserves notices; it does not certify legal compatibility, permitted use, or all license obligations. Data-source terms and basemap attribution remain separate.\n');
writeFileSync('public/THIRD_PARTY_NOTICES.txt', Buffer.concat([introduction, ...sections]));
writeFileSync('public/THIRD_PARTY_NOTICES.json', `${JSON.stringify({ scope: 'non-development lockfile closure plus retained adaptations and embedded vendor texts', notices: inventory }, null, 2)}\n`);
console.log(`Retained ${inventory.length} notices in public/THIRD_PARTY_NOTICES.{txt,json}`);
