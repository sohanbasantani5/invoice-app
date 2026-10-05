// Kept apart from command-menu.tsx so the sidebar can open the menu without bundling the menu itself.
export const OPEN_COMMAND_MENU = "open-command-menu";
export function openCommandMenu() {
  window.dispatchEvent(new Event(OPEN_COMMAND_MENU));
}
