// The design demo never reads or overwrites the live application's saved session.
const prefix = document.documentElement.dataset.rakshaDemo === "true" ? "raksha_design_demo:" : "";
export const appStorage = {
  getItem: (key: string) => localStorage.getItem(prefix + key),
  setItem: (key: string, value: string) => localStorage.setItem(prefix + key, value),
  removeItem: (key: string) => localStorage.removeItem(prefix + key),
};
