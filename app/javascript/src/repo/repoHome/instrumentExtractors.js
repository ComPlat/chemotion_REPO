import JSZip from 'jszip';

const HEADER_BYTES = 65536;

const JCAMP_PATTERNS = [
  /^##\$INSTRUM\s*=\s*(.+)$/im,
  /^##\.?SPECTROMETER\/DATA SYSTEM\s*=\s*(.+)$/im,
  /^##\$INSTRNAM\s*=\s*(.+)$/im,
];

// Trim whitespace, strip JCAMP `<…>` brackets, and discard the generic
// Bruker placeholder so callers can fall back to the next source.
const cleanInstrumentValue = (raw) => {
  if (!raw) return null;
  const v = raw.trim().replace(/^<|>$/g, '').trim();
  if (!v) return null;
  if (v.toLowerCase() === 'spect') return null;
  return v;
};

const matchFirst = (text, patterns) => {
  for (const re of patterns) {
    const m = text.match(re);
    const v = cleanInstrumentValue(m && m[1]);
    if (v) return v;
  }
  return null;
};

// Read the instrument out of a JCAMP/JDX file's header block.
export const extractInstrumentFromJcamp = (file) => new Promise((resolve) => {
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.jdx') && !name.endsWith('.jcamp') && !name.endsWith('.dx')) {
    resolve(null);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const head = (e.target.result || '').toString().slice(0, HEADER_BYTES);
    resolve(matchFirst(head, JCAMP_PATTERNS));
  };
  reader.onerror = () => resolve(null);
  reader.readAsText(file.slice(0, HEADER_BYTES));
});

// Bruker NMR data ships as a zip whose experiment folders contain JCAMP-DX
// parameter files (`acqus` / `acqu`) plus a free-text `uxnmr.info`. Prefer
// the descriptive `System       : Avance III …` line from uxnmr.info,
// falling back to `##$INSTRUM= <spect>` from acqus.
export const extractInstrumentFromBrukerZip = async (file) => {
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.zip')) return null;

  try {
    const zip = await JSZip.loadAsync(file);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    const sortByDepth = (a, b) => a.length - b.length;
    const infoFiles = paths.filter((p) => /(^|\/)uxnmr\.info$/i.test(p)).sort(sortByDepth);
    const acqusFiles = paths.filter((p) => /(^|\/)acqus?$/i.test(p)).sort(sortByDepth);

    for (const path of infoFiles) {
      const text = (await zip.files[path].async('string')).slice(0, HEADER_BYTES);
      const m = text.match(/^\s*System\s*:\s*(.+)$/im);
      const v = cleanInstrumentValue(m && m[1]);
      if (v) return v;
    }

    for (const path of acqusFiles) {
      const text = (await zip.files[path].async('string')).slice(0, HEADER_BYTES);
      const v = matchFirst(text, JCAMP_PATTERNS);
      if (v) return v;
    }
  } catch (_) {
    return null;
  }
  return null;
};

// Run extractors in order and return the first non-null instrument string.
export const extractInstrumentFromFile = async (file) => (
  (await extractInstrumentFromJcamp(file))
  || (await extractInstrumentFromBrukerZip(file))
);
