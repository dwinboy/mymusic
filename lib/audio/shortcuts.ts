/**
 * The keyboard shortcuts the player answers to, in one list so the overlay
 * that documents them can't drift from the handler that implements them.
 *
 * Deliberately the set people already know from other players — space to
 * play, arrows to move, M to mute — rather than anything this app invents.
 */
export interface Shortcut {
  /** event.key values this responds to, lowercased for letters. */
  keys: string[];
  /** How the keys are written in the overlay. */
  label: string;
  description: string;
  group: "Playback" | "Sound" | "Elsewhere";
  /** True when the shortcut does nothing on this device, so it can be hidden. */
  requiresVolume?: boolean;
}

export const SEEK_SECONDS = 10;
export const VOLUME_STEP = 0.05;

export const SHORTCUTS: Shortcut[] = [
  { keys: [" ", "k"], label: "Space", description: "Play or pause", group: "Playback" },
  { keys: ["arrowright"], label: "→", description: `Forward ${SEEK_SECONDS} seconds`, group: "Playback" },
  { keys: ["arrowleft"], label: "←", description: `Back ${SEEK_SECONDS} seconds`, group: "Playback" },
  { keys: ["n"], label: "N", description: "Next track", group: "Playback" },
  { keys: ["p"], label: "P", description: "Previous track", group: "Playback" },
  { keys: ["s"], label: "S", description: "Shuffle on or off", group: "Playback" },
  { keys: ["r"], label: "R", description: "Repeat: off, all, one", group: "Playback" },
  { keys: ["arrowup"], label: "↑", description: "Volume up", group: "Sound", requiresVolume: true },
  { keys: ["arrowdown"], label: "↓", description: "Volume down", group: "Sound", requiresVolume: true },
  { keys: ["m"], label: "M", description: "Mute or unmute", group: "Sound" },
  { keys: ["q"], label: "Q", description: "Show the queue", group: "Elsewhere" },
  { keys: ["/"], label: "/", description: "Search", group: "Elsewhere" },
  { keys: ["?"], label: "?", description: "This list", group: "Elsewhere" },
];

/**
 * Whether a keystroke belongs to whatever the person is typing in rather than
 * to the player. Without this, a space in the search box pauses the music.
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  // Radix menus, sheets and dialogs run their own key handling.
  return !!target.closest('[role="menu"], [role="dialog"], [role="listbox"]');
}
