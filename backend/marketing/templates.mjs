import { readdir, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');

export async function listTemplates() {
  const names = await readdir(TEMPLATES_DIR);
  const out = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const raw = await readFile(join(TEMPLATES_DIR, name), 'utf8');
    const data = JSON.parse(raw);
    out.push({
      id: data.id || name.replace(/\.json$/, ''),
      product: data.product || '',
      format: data.format || 'text',
      title: data.title || '',
      default_channels: data.default_channels || ['manual'],
      render: Boolean(data.render),
      file: name
    });
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export async function loadTemplate(id) {
  const want = String(id || '').trim();
  if (!want) return null;
  const names = await readdir(TEMPLATES_DIR);
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const raw = await readFile(join(TEMPLATES_DIR, name), 'utf8');
    const data = JSON.parse(raw);
    const tid = data.id || name.replace(/\.json$/, '');
    if (tid === want || name === `${want}.json`) {
      return {
        id: tid,
        product: data.product || '',
        format: data.format || 'text',
        title: data.title || '',
        body: data.body || '',
        cta_url: data.cta_url || '',
        default_channels: Array.isArray(data.default_channels)
          ? data.default_channels
          : ['manual'],
        render: Boolean(data.render),
        source_image: data.source_image || null,
        duration_sec: data.duration_sec || null
      };
    }
  }
  return null;
}

export function applyTemplate(tpl, overrides = {}) {
  const cta = String(overrides.cta_url ?? tpl.cta_url ?? '').trim();
  const title = String(overrides.title ?? tpl.title ?? '').trim();
  let body = String(overrides.body ?? tpl.body ?? '');
  body = body.replace(/\{\{\s*cta_url\s*\}\}/g, cta);
  return {
    product: String(overrides.product ?? tpl.product ?? '').trim(),
    format: String(overrides.format ?? tpl.format ?? 'text').trim() || 'text',
    title,
    body,
    cta_url: cta,
    channels: Array.isArray(overrides.channels)
      ? overrides.channels.map(String)
      : [...(tpl.default_channels || ['manual'])]
  };
}
