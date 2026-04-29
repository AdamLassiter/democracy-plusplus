import axios, { type AxiosError } from "axios";
import type { ItemProperties, MissionLength, StratagemCategory } from "../src/types.ts";
import { note } from "./terminalUi.ts";

export const BASE_URL = "https://helldivers.wiki.gg";
export const API_URL = `${BASE_URL}/api.php`;

const USER_AGENT = "DemocracyPlusPlus/1.0";
const REQUEST_DELAY_MS = 150;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

type WeaponCategory = "primary" | "secondary" | "throwable";

export interface WikiPageSource {
  title: string;
  slug: string;
  content: string;
}

export interface LinkedWikiItem {
  displayName: string;
  wikiSlug: string;
  imageFileTitle: string;
  wikiImageUrl?: string | null;
}

export interface ScrapedWeaponItem extends LinkedWikiItem {
  weaponCategory: WeaponCategory;
  weaponTag: string | null;
}

export interface ScrapedStratagemItem extends LinkedWikiItem {
  stratagemCategory: StratagemCategory;
  stratagemTag: string;
  stratagemCode: string[];
}

export type ScrapedItem = LinkedWikiItem | ScrapedWeaponItem | ScrapedStratagemItem;

export interface ScrapedObjectiveItem {
  displayName: string;
  wikiSlug: string;
  minDifficulty: number | null;
  maxDifficulty: number | null;
  missionLength: MissionLength | null;
}

interface MediaWikiApiError {
  code?: string;
  info?: string;
}

interface QueryPage {
  title: string;
  missing?: boolean;
  revisions?: Array<{
    slots?: {
      main?: {
        content?: string;
      };
    };
  }>;
  imageinfo?: Array<{
    url?: string;
  }>;
}

interface QueryResponse {
  error?: MediaWikiApiError;
  query?: {
    pages?: QueryPage[];
    categorymembers?: Array<{
      title: string;
    }>;
  };
}

interface ExpandTemplatesResponse {
  error?: MediaWikiApiError;
  expandtemplates?: {
    wikitext?: string;
  };
}

type ApiResponse = QueryResponse | ExpandTemplatesResponse;

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function apiGet(params: Record<string, string | number>) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get<ApiResponse>(API_URL, {
        params,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (data?.error) {
        throw new Error(data.error.info || data.error.code || "MediaWiki API error");
      }

      return data;
    } catch (error) {
      if (!isAxiosError(error)) {
        throw error;
      }

      const status = error.response?.status;
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      const retryAfterSeconds = Number(retryAfterHeader);
      const shouldRetry = status === 429 || (status !== undefined && status >= 500 && status <= 599);

      if (!shouldRetry || attempt === MAX_RETRIES) {
        throw error;
      }

      const exponentialDelay = BASE_BACKOFF_MS * (2 ** attempt);
      const retryAfterDelay = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0;
      const delay = Math.max(exponentialDelay, retryAfterDelay);

      note(`MediaWiki API ${status ?? "error"} retry in ${Math.round(delay / 1000)}s (${attempt + 1}/${MAX_RETRIES})`, "warn");
      await sleep(delay);
    }
  }

  throw new Error("Unreachable");
}

export function titleToSlug(title: string) {
  return title.trim().replace(/ /g, "_");
}

export function slugToTitle(slug: string) {
  return slug.replace(/_/g, " ");
}

export function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase();
}

export function canonicalizeName(value: string | null | undefined) {
  return normalizeName(value)?.replace(/[^a-z0-9]+/g, "") ?? "";
}

export function toInternalName(displayName: string) {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getImageFileName(wikiImageUrl: string | null | undefined) {
  return wikiImageUrl?.split("/").pop()?.replace(/\?.*/, "");
}

function stripQuery(url: string | undefined) {
  return url?.replace(/\?.*/, "");
}

function chunk<T>(array: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function cleanWikiText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\[\[File:[^\]]+\]\]/gi, "")
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/'''?/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstWikiLink(value: string) {
  const match = value.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
  if (!match) {
    return null;
  }

  return {
    target: match[1].trim(),
    text: (match[2] ?? match[1]).trim(),
  };
}

function extractFileTitle(value: string) {
  const match = value.match(/(?:^|\[\[)File:([^|\]]+)/i);
  if (!match) {
    return null;
  }

  return `File:${match[1].trim()}`;
}

export async function fetchPageSources(titles: string[]) {
  const results = new Map<string, WikiPageSource>();

  for (const titleChunk of chunk(titles, 20)) {
    const data = (await apiGet({
      action: "query",
      titles: titleChunk.join("|"),
      prop: "revisions",
      rvslots: "main",
      rvprop: "content",
      redirects: 1,
      format: "json",
      formatversion: 2,
    })) as QueryResponse;

    for (const page of data.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (!content || page.missing) {
        continue;
      }

      results.set(titleToSlug(page.title), {
        title: page.title,
        slug: titleToSlug(page.title),
        content,
      });
    }
  }

  return results;
}

export async function fetchPageSource(title: string) {
  const pages = await fetchPageSources([title]);
  return pages.get(titleToSlug(title)) ?? null;
}

export async function fetchCategoryMembers(categoryTitle: string) {
  const data = (await apiGet({
    action: "query",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmlimit: "max",
    format: "json",
    formatversion: 2,
  })) as QueryResponse;

  return (data.query?.categorymembers ?? []).map((member) => member.title);
}

function parseInfoboxDifficulty(content: string, fieldName: "min_difficulty_main" | "max_difficulty_main") {
  const match = content.match(new RegExp(`\\|\\s*${fieldName}\\s*=\\s*([^\\n|]+)`, "i"));
  if (!match) {
    return null;
  }

  const value = cleanWikiText(match[1]);
  const difficultyMatch = value.match(/\d+/);
  return difficultyMatch ? Number.parseInt(difficultyMatch[0], 10) : null;
}

function parseMissionLength(content: string) {
  const match = content.match(/\|\s*time_limit_main\s*=\s*([^\n|]+)/i);
  if (!match) {
    return null;
  }

  const value = cleanWikiText(match[1]);
  const minutesMatch = value.match(/\d+/);
  if (!minutesMatch) {
    return null;
  }

  const minutes = Number.parseInt(minutesMatch[0], 10);
  return minutes <= 30 ? "short" : "long";
}

export async function fetchMainObjectives() {
  const titles = await fetchCategoryMembers("Category:Main_Objectives");
  const filteredTitles = titles.filter((title) => !title.includes("/"));
  const pageSources = await fetchPageSources(filteredTitles);

  return filteredTitles.map((title): ScrapedObjectiveItem => {
    const pageSource = pageSources.get(titleToSlug(title));

    return {
      displayName: title,
      wikiSlug: titleToSlug(title),
      minDifficulty: pageSource ? parseInfoboxDifficulty(pageSource.content, "min_difficulty_main") : null,
      maxDifficulty: pageSource ? parseInfoboxDifficulty(pageSource.content, "max_difficulty_main") : null,
      missionLength: pageSource ? parseMissionLength(pageSource.content) : null,
    };
  });
}

export async function expandTemplate(text: string, title: string) {
  const data = (await apiGet({
    action: "expandtemplates",
    text,
    title,
    prop: "wikitext",
    format: "json",
    formatversion: 2,
  })) as ExpandTemplatesResponse;

  await sleep(REQUEST_DELAY_MS);
  return data.expandtemplates?.wikitext ?? "";
}

export async function resolveImageUrls(fileTitles: Array<string | null | undefined>) {
  const results = new Map<string, string>();
  const deduped = [...new Set(fileTitles.filter((title): title is string => Boolean(title)))];

  for (const fileChunk of chunk(deduped, 20)) {
    const data = (await apiGet({
      action: "query",
      titles: fileChunk.join("|"),
      prop: "imageinfo",
      iiprop: "url",
      redirects: 1,
      format: "json",
      formatversion: 2,
    })) as QueryResponse;

    for (const page of data.query?.pages ?? []) {
      const url = stripQuery(page.imageinfo?.[0]?.url);
      if (url) {
        results.set(page.title, url);
      }
    }
  }

  return results;
}

function normalizeWeaponTag(rawTag: string) {
  const map: Record<string, string> = {
    "Assault Rifle": "AssaultRifle",
    "Marksman Rifle": "MarksmanRifle",
    "Submachine Gun": "SubmachineGun",
    "Energy-Based": "EnergyWeapon",
  };

  return map[rawTag] ?? rawTag.replace(/[^A-Za-z0-9]+/g, "");
}

function parseGalleryItem(line: string): LinkedWikiItem | null {
  const parts = line.split("|");
  if (parts.length < 3) {
    return null;
  }

  const imageName = parts[0].trim();
  const linkMatch = line.match(/(?:^|\|)link=([^|]+)/);
  const link = linkMatch?.[1]?.trim();
  const wikiLink = extractFirstWikiLink(line);
  const displayName = wikiLink?.text ?? slugToTitle(link ?? "");
  const wikiSlug = titleToSlug(link ?? wikiLink?.target ?? displayName);

  if (!imageName || !wikiSlug || !displayName) {
    return null;
  }

  return {
    displayName,
    wikiSlug,
    imageFileTitle: `File:${imageName}`,
  };
}

function parseStratagemCodeCell(value: string) {
  const matches = [...value.matchAll(/Stratagem Arrow (Up|Down|Left|Right)\.svg/gi)];
  return matches.map((match) => {
    const direction = match[1].toLowerCase();
    return direction.charAt(0).toUpperCase() + direction.slice(1);
  });
}

export function parseWeaponsPageSource(content: string) {
  const weaponrySection = content.split("==Support Weapons==")[0];
  const lines = weaponrySection.split("\n");
  const results: ScrapedWeaponItem[] = [];
  let weaponCategory: WeaponCategory | null = null;
  let weaponTag: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "Primary=") {
      weaponCategory = "primary";
      weaponTag = null;
      continue;
    }

    if (line === "|-|Secondary=") {
      weaponCategory = "secondary";
      weaponTag = null;
      continue;
    }

    if (line === "|-|Throwable=") {
      weaponCategory = "throwable";
      weaponTag = null;
      continue;
    }

    if (!weaponCategory) {
      continue;
    }

    const tagMatch = line.match(/^([^={}[\\]|][^=]*)=$/);
    if (tagMatch) {
      const rawTag = tagMatch[1].trim();
      if (!["Primary", "Secondary", "Throwable"].includes(rawTag)) {
        weaponTag = normalizeWeaponTag(rawTag);
      }
      continue;
    }

    if (!line.includes("|link=") || !line.includes("[[")) {
      continue;
    }

    const item = parseGalleryItem(line);
    if (!item) {
      continue;
    }

    results.push({
      ...item,
      weaponCategory,
      weaponTag,
    });
  }

  return results;
}

function parseSimpleTableRows(wikitext: string) {
  const rows: string[][] = [];
  const tableMatch = wikitext.match(/{\|[\s\S]*?\|}/g) ?? [];

  for (const table of tableMatch) {
    let currentRow: string[] = [];

    for (const rawLine of table.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("{|") || line.startsWith("!")) {
        continue;
      }

      if (line === "|-") {
        if (currentRow.length) {
          rows.push(currentRow);
          currentRow = [];
        }
        continue;
      }

      if (line.startsWith("|")) {
        const cells = line
          .slice(1)
          .split("||")
          .map((cell) => cell.trim());
        currentRow.push(...cells);
      }
    }

    if (currentRow.length) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseLinkedItemRows(wikitext: string) {
  return parseSimpleTableRows(wikitext)
    .map((cells): LinkedWikiItem | null => {
      const imageFileTitle = extractFileTitle(cells[0] ?? "");
      const wikiLink = extractFirstWikiLink(cells[1] ?? "");
      if (!imageFileTitle || !wikiLink) {
        return null;
      }

      return {
        displayName: wikiLink.text,
        wikiSlug: titleToSlug(wikiLink.target),
        imageFileTitle,
      };
    })
    .filter((item): item is LinkedWikiItem => item !== null);
}

export async function parseStratagemsPageSource(content: string) {
  const currentSection = content.split("== Mission Stratagems ==")[0];
  const lines = currentSection.split("\n");
  const templateByHeading: Array<{ heading: string; templateText: string; templateArg: string | null }> = [];
  let heading: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      continue;
    }

    const templateMatch = line.match(/^{{Stratagem Table(?:\|([^}]+))?}}$/);
    if (templateMatch && heading) {
      templateByHeading.push({
        heading,
        templateText: line,
        templateArg: templateMatch[1]?.trim() ?? null,
      });
    }
  }

  const mapping: Record<string, { category: StratagemCategory; tag: string }> = {
    "Support Weapons": { category: "Supply", tag: "Weapons" },
    "Orbital Strikes": { category: "Orbital", tag: "Orbital" },
    "Eagle Strikes": { category: "Eagle", tag: "Eagle" },
    Emplacements: { category: "Defense", tag: "Emplacement" },
    Sentries: { category: "Defense", tag: "Sentry" },
    Backpacks: { category: "Supply", tag: "Backpacks" },
    Vehicles: { category: "Supply", tag: "Vehicles" },
  };

  const results: ScrapedStratagemItem[] = [];
  for (const entry of templateByHeading) {
    const mapped = mapping[entry.heading];
    if (!mapped) {
      continue;
    }

    const expanded = await expandTemplate(entry.templateText, "Stratagems");
    const items = parseSimpleTableRows(expanded)
      .map((cells): ScrapedStratagemItem | null => {
        const imageFileTitle = extractFileTitle(cells[0] ?? "");
        const wikiLink = extractFirstWikiLink(cells[1] ?? "");
        const stratagemCode = parseStratagemCodeCell(cells[2] ?? "");
        if (!imageFileTitle || !wikiLink || !stratagemCode.length) {
          return null;
        }

        return {
          displayName: wikiLink.text,
          wikiSlug: titleToSlug(wikiLink.target),
          imageFileTitle,
          stratagemCategory: mapped.category,
          stratagemTag: mapped.tag,
          stratagemCode,
        };
      })
      .filter((item): item is ScrapedStratagemItem => item !== null);
    results.push(...items);
  }

  return results;
}

export function parseBoostersPageSource(content: string) {
  return parseLinkedItemRows(content);
}

export async function parseArmorPassivesPageSource(_content: string) {
  const expanded = await expandTemplate("{{Armor Passive List}}", "Armor Passives");
  const results: LinkedWikiItem[] = [];
  const regex =
    /===\s*([^=]+?)\s*===\s*\n\s*<big>\s*\[\[File:([^|\]]+)[^\]]*]\]\s*\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;

  for (const match of expanded.matchAll(regex)) {
    results.push({
      displayName: (match[4] ?? match[3]).trim(),
      wikiSlug: titleToSlug(match[3].trim()),
      imageFileTitle: `File:${match[2].trim()}`,
    });
  }

  return results;
}

interface ExistingWikiItem {
  displayName: string;
}

export function findBestScrapedMatch<T extends ExistingWikiItem>(
  existingItem: ExistingWikiItem,
  scrapedItems: T[],
  usedScrapedIndexes: Set<number>,
) {
  const normalizedExistingName = normalizeName(existingItem.displayName);
  const canonicalExistingName = canonicalizeName(existingItem.displayName);

  for (const [index, scrapedItem] of scrapedItems.entries()) {
    if (usedScrapedIndexes.has(index)) {
      continue;
    }

    if (normalizeName(scrapedItem.displayName) === normalizedExistingName) {
      return { index, scrapedItem, matchType: "exact" as const };
    }
  }

  if (!canonicalExistingName) {
    return null;
  }

  const similarMatches = scrapedItems.filter((scrapedItem, index) => {
    if (usedScrapedIndexes.has(index)) {
      return false;
    }

    const canonicalScrapedName = canonicalizeName(scrapedItem.displayName);
    return canonicalScrapedName !== ""
      && (canonicalExistingName.includes(canonicalScrapedName)
        || canonicalScrapedName.includes(canonicalExistingName));
  });

  if (similarMatches.length !== 1) {
    return null;
  }

  const [scrapedItem] = similarMatches;
  const index = scrapedItems.indexOf(scrapedItem);
  return { index, scrapedItem, matchType: "similar" as const };
}

type AttackSection = Record<string, string>;
type ParsedAttackTables = Record<string, Record<string, AttackSection>>;

export function parseExpandedAttackTables(wikitext: string): ItemProperties {
  const result: ParsedAttackTables = {};
  const tables = wikitext.match(/{\|[\s\S]*?\|}/g) ?? [];

  for (const table of tables) {
    let tableTitle: string | null = null;
    let currentSection = "Base";

    for (const rawLine of table.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("{|") || line === "|}" || line === "|-") {
        continue;
      }

      const headerMatch = line.match(/^!colspan=2\|(.*)$/i);
      if (headerMatch) {
        const headerText = cleanWikiText(headerMatch[1]);
        if (!tableTitle) {
          tableTitle = headerText;
          if (!result[tableTitle]) {
            result[tableTitle] = {};
          }
        } else {
          currentSection = headerText || "Base";
          if (!result[tableTitle][currentSection]) {
            result[tableTitle][currentSection] = {};
          }
        }
        continue;
      }

      if (!tableTitle || !line.startsWith("|")) {
        continue;
      }

      const cells = line
        .slice(1)
        .split("||")
        .map((cell) => cleanWikiText(cell));

      if (cells.length === 2) {
        if (!result[tableTitle][currentSection]) {
          result[tableTitle][currentSection] = {};
        }
        result[tableTitle][currentSection][cells[0]] = cells[1];
      }
    }
  }

  return result;
}

export function findAttackTemplateInvocation(content: string) {
  const matches = content.match(/{{\s*Attack[\s_]+Data[^{}]*}}/gi) ?? [];
  return matches[0] ?? null;
}

export function extractInfoboxImageFile(content: string, pageTitle: string) {
  const imageMatch = content.match(/^\|\s*image\s*=\s*(.+)$/m);
  if (!imageMatch) {
    return null;
  }

  const rawValue = imageMatch[1]
    .replace(/{{\s*PAGENAME\s*}}/gi, pageTitle)
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  if (!rawValue) {
    return null;
  }

  const linkedFile = extractFileTitle(rawValue);
  if (linkedFile) {
    return linkedFile;
  }

  return `File:${rawValue.replace(/^File:/i, "").trim()}`;
}
