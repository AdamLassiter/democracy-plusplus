import { loadJson } from "./loadJson";
import type { StructuresData } from "../types";

export const STRUCTURES = await loadJson<StructuresData>("/data/structures.json");
