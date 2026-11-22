export const MODULE_VISIBILITY_CHANGED_EVENT = "crm:module-visibility-changed";

export function notifyModuleVisibilityChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MODULE_VISIBILITY_CHANGED_EVENT));
  }
}