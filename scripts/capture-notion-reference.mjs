// Captures a public Notion page (notion.site) for 1:1 comparison: screenshots and computed styles of every block.
// Usage: node scripts/capture-notion-reference.mjs <public url> <name> [--headed]  → ref/live/<name>.png|-full.png|.json (git-ignored).
// Run it occasionally and by hand: notion.site answers repeated automated loads with a Cloudflare check.
// With --headed a real Chrome window opens so a person can pass that check; never try to bypass it.
import { chromium } from '@playwright/test';
const [url, name] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const browser = await chromium.launch({ channel: 'chrome', headless: !process.argv.includes('--headed') });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'fr-FR' });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.notion-page-content [data-block-id]', { state: 'attached', timeout: 90000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: `ref/live/${name}.png` });
await page.screenshot({ path: `ref/live/${name}-full.png`, fullPage: true });
const styles = await page.evaluate(() => {
  const pick = el => { const c = getComputedStyle(el), r = el.getBoundingClientRect(); return { cls: [...el.classList].filter(x => x.startsWith('notion')).join(' '), text: (el.textContent || '').trim().slice(0, 40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), font: `${c.fontWeight} ${c.fontSize}/${c.lineHeight} ${c.fontFamily.slice(0, 40)}`, color: c.color, bg: c.backgroundColor, pad: c.padding, margin: c.margin, radius: c.borderRadius }; };
  return [...document.querySelectorAll('[data-block-id], .notion-topbar, .notion-sidebar, .notion-page-block, .notion-scroller')].slice(0, 400).map(pick);
});
await import('node:fs').then(fs => { fs.mkdirSync('ref/live', { recursive: true }); fs.writeFileSync(`ref/live/${name}.json`, JSON.stringify(styles, null, 1)); });
console.log(name, styles.length, [...new Set(styles.map(s => s.cls.split(' ')[0]))].join(' '));
await browser.close();
