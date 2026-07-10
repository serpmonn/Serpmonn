#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const siteDir = path.join(process.cwd(), 'site');

const replacements = [
  ['news.njk', '{{ localesNews[locale].news.closeAd }}'],
  ['password-generator.njk', '{{ passwordGenerator[locale].ads.closeAria }}'],
  ['utm-builder.njk', '{{ utmBuilder[locale].ads.closeAria }}'],
  ['how-to-calculate-the-eco-footprint-of-products.njk', '{{ localesNews[locale].news.closeAd }}'],
  ['web-tech-trends-2025.njk', '{{ webTechTrends2025[locale].ads.closeAria }}'],
  ['updates-august-17.njk', '{{ updatesAugust17[locale].ads.closeAria }}'],
  ['fuel-calculator.njk', '{{ fuelCalculator[locale].ads.closeAria }}'],
  ['indexnow-practical-guide.njk', '{{ article.common.closeAd }}'],
  ['updates-aug-25-sep-15.njk', '{{ updatesAug25Sep15[locale].ads.closeAria }}'],
  ['cookies-complete-guide.njk', '{{ localesNews[locale].news.closeAd }}'],
  ['web-development-guide.njk', '{{ webDevelopmentGuide[locale].article.buttons.closeAdAria }}'],
  ['port-forwarding-guide.njk', '{{ portForwardingGuide[locale].article.buttons.closeAdAria }}'],
  ['product-footprint-calculator.njk', '{{ productFootprintCalculator[locale].ads.closeAria }}'],
  ['unit-converter.njk', '{{ unitConverter[locale].page.labels.closeAd }}'],
  ['word-counter.njk', '{{ wordCounter[locale].ads.closeAria }}'],
  ['how-to-calculate-depreciation.njk', '{{ article.closeAd }}'],
];

const anchorBlockRe = /(?:[ \t]*<!--[^\n]*[Мм]обил[^\n]*-->\s*\n)?[ \t]*<div id="mobile-anchor-ad"[\s\S]*?<\/div>\s*\n[ \t]*<\/div>\s*\n/g;
const anchorInitScriptRe = /[ \t]*<script>\s*\n[ \t]*\(function\(\)\{\s*\n[ \t]*if \(localStorage\.getItem\('anchor_closed'\)==='1'\) return;[\s\S]*?\}\)\(\);\s*\n[ \t]*<\/script>\s*\n/g;
const anchorCollapseRe = /[ \t]*\/\*ANCHOR_COLLAPSE\*\/[\s\S]*?\}\)\(\);\s*\n/g;
const domAnchorInitRe = /[ \t]*\/\/ Мобильная (?:якорная )?реклама\s*\n[ \t]*\(function\(\)\{[\s\S]*?visualViewport[\s\S]*?\}\)\(\);\s*\n/g;
const domAnchorInitSimpleRe = /[ \t]*\/\/ Мобильная реклама\s*\n[ \t]*if \(localStorage\.getItem\('anchor_closed'\) !== '1'\) \{[\s\S]*?visualViewport[\s\S]*?\}\s*\n[ \t]*\}\s*\n/g;

const partialBlock = (closeLabel) => `{% from "partials/mobile-anchor-ad.njk" import mobileAnchor %}\n{{ mobileAnchor(${closeLabel}) }}\n`;

for (const [file, closeLabel] of replacements) {
  const filePath = path.join(siteDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', file);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('partials/mobile-anchor-ad.njk')) {
    console.log('already migrated', file);
    continue;
  }

  content = content.replace(anchorBlockRe, '');
  content = content.replace(anchorInitScriptRe, '');
  content = content.replace(anchorCollapseRe, '');
  content = content.replace(domAnchorInitRe, '');
  content = content.replace(domAnchorInitSimpleRe, '');

  if (content.includes('id="mobile-anchor-ad"')) {
    console.warn('anchor markup remains in', file);
    continue;
  }

  content = content.replace('</body>', `${partialBlock(closeLabel)}</body>`);
  fs.writeFileSync(filePath, content);
  console.log('migrated', file);
}
