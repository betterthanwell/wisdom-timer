// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// vercel.json sets the real security headers; index.html repeats them as
// <meta> tags, which are all that `vite preview` (and so the e2e tests) serve
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

const headers = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value])
);
const metaContent = (attribute, name) => new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`).exec(html)?.[1];
const directives = (policy) => policy.split(';').map((directive) => directive.trim()).filter(Boolean).sort();

describe('index.html security meta tags', () => {
  it('repeat the Content-Security-Policy of vercel.json (all but upgrade-insecure-requests)', () => {
    expect(directives(metaContent('http-equiv', 'Content-Security-Policy'))).toEqual(
      directives(headers['Content-Security-Policy']).filter((directive) => directive !== 'upgrade-insecure-requests')
    );
  });

  it('repeat its other headers', () => {
    expect(metaContent('http-equiv', 'X-Content-Type-Options')).toBe(headers['X-Content-Type-Options']);
    expect(metaContent('http-equiv', 'X-Frame-Options')).toBe(headers['X-Frame-Options']);
    expect(metaContent('name', 'referrer')).toBe(headers['Referrer-Policy']);
  });
});
