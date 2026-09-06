import { loadJson } from "./loadJson";
import type { BestiaryData } from "../types";

export const BESTIARY = await loadJson<BestiaryData>("/data/enemies.json");
