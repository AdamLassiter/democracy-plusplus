import { loadJson } from "./loadJson";
import type { Restriction } from "../types";

export const RESTRICTIONS = await loadJson<Restriction[]>('/data/restrictions.json');
