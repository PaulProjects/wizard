import { ui, defaultLang } from './ui';

export function useTranslations(lang: "en" | "de") {
  return function t(key: keyof typeof ui) {
    return ui[key][lang] || ui[key][defaultLang];
  }
}