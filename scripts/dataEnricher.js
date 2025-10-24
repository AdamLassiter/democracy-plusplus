/* eslint-disable no-undef */

import fs from 'fs';
import readline from 'readline';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Import all your data arrays
import { PRIMARIES } from '../src/constants/primaries.js';
import { SECONDARIES } from '../src/constants/secondaries.js';
import { THROWABLES } from '../src/constants/throwables.js';
import { STRATAGEMS } from '../src/constants/stratagems.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, answer => resolve(answer)));
}

async function processItem(item) {
  let wikiUrl = `https://helldivers.wiki.gg/wiki/${item.wikiSlug}`,
   proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(wikiUrl)}`;

  const headers = {
    "User-Agent": "MyHelldiversScraper/1.0 (https://adamlassiter.github.io)",
    "Accept": "text/html,application/xhtml+xml"
  };
  let response,
   retries = 1,

   tables;
  while (!item.hoverText) {
    if (retries > 10) {
      const newSlug = await askQuestion(`Enter new wikiSlug for ${item.displayName}: `);
      if (newSlug) {
        item.wikiSlug = newSlug;
        wikiUrl = `https://helldivers.wiki.gg/wiki/${item.wikiSlug}`;
        proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(proxyUrl)}`;
      }
    }

    response = await fetch(proxyUrl, { headers });
    if (!response.ok) {
      console.log(`Wiki page not found for ${item.wikiSlug} at ${wikiUrl}`);
      console.log('Retrying...');
      retries++;
      continue;
    }

    console.log(`Fetched ${item.wikiSlug}`);

    const htmlText = await response.text(),
     {document} = new JSDOM(htmlText).window,

     displayName = document.querySelector('.mw-page-title-main')?.innerHTML,
     weaponTables = document.querySelectorAll('.table-weapon-stats');
    tables = [...weaponTables];

    if (!displayName || !tables.length) {
      console.log(`No table found for ${item.wikiSlug} at ${wikiUrl}`);
      const retry = await askQuestion(`Retry? `);
      if (retry === 'y') {
        console.log('Retrying...');
        retries++;
        continue;
      }
    }

    item.displayName = displayName;
    item.hoverTexts = tables.map(table => table.outerHTML.replaceAll(/ href="[^"]*"/, ''));

    break;
  }
}

async function processArray(array, arrayName) {
  console.log(`Processing ${arrayName}...`);
  for (const item of array) {
    await processItem(item);
  }
  // Save updated array to a new file
  const filename = `${arrayName.toLowerCase()}_updated.js`;
  fs.writeFileSync(filename, `export const ${arrayName} = ${JSON.stringify(array, null, 2)};`);
  console.log(`Updated ${arrayName} saved to ${filename}`);
}

async function main() {
  await processArray(PRIMARIES, 'PRIMARIES');
  await processArray(SECONDARIES, 'SECONDARIES');
  await processArray(THROWABLES, 'THROWABLES');
  await processArray(STRATAGEMS, 'STRATAGEMS');

  rl.close();
  console.log('All data processed!');
}

main();
