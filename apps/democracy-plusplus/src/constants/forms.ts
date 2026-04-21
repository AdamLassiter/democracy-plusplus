import { loadJson } from "./loadJson";
import type { FormTemplate } from "../types";

export const FORMS = await loadJson<FormTemplate[]>('/data/forms.json');
