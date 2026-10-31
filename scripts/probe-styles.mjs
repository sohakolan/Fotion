import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'fr-FR' });
await page.goto('http://127.0.0.1:5175');
await page.waitForSelector('.prose');
await page.waitForTimeout(1500);

const probe = await page.evaluate(`(() => {
  const pick = (el, keys) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const out = {};
    for (const k of keys) out[k] = s.getPropertyValue(k);
    return out;
  };
  const q = (sel) => document.querySelector(sel);
  const root = getComputedStyle(document.documentElement);
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    fgVar: root.getPropertyValue('--fg') || root.getPropertyValue('--text') || root.getPropertyValue('--text-primary'),
    title: pick(q('.page-title, [class*=title] h1, h1'), ['font-size', 'font-weight', 'line-height', 'color']),
    para: pick(q('.prose p'), ['font-size', 'line-height', 'padding', 'margin', 'color', 'font-family']),
    h1: pick(q('.prose h1'), ['font-size', 'margin-top', 'font-weight', 'line-height']),
    h2: pick(q('.prose h2'), ['font-size', 'margin-top', 'font-weight', 'line-height']),
    inlineCode: pick(q('.prose :not(pre) > code'), ['background-color', 'color', 'padding', 'border-radius', 'font-size']),
    codeBlock: pick(q('.prose pre'), ['background-color', 'padding', 'border-radius', 'font-size']),
    quote: pick(q('.prose blockquote'), ['border-left', 'margin', 'padding-left', 'font-size', 'line-height']),
    hr: pick(q('.prose hr'), ['border-top', 'height', 'margin']),
    bullet: pick(q('.prose li'), ['font-size', 'padding', 'margin', 'line-height']),
    checkbox: pick(q('.prose input[type=checkbox]'), ['accent-color', 'width', 'height', 'margin']),
    content: pick(q('.prose'), ['max-width', 'width', 'padding-left']),
    sidebar: pick(q('.sidebar'), ['background-color', 'width', 'color']),
  };
})()`);
console.log(JSON.stringify(probe, null, 2));
await browser.close();
