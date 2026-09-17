/**
 * Reports listening to /api/events/play. Tracks *listened* time — media-time
 * advanced during normal playback — rather than playback position, so seeking
 * to 0:31 and pausing doesn't masquerade as thirty seconds of listening.
 *
 * Deliberately sparse on the network: one request to start a play, one when
 * it crosses the counting threshold, one on completion, and a final flush when
 * the track changes or the page is hidden. Not a heartbeat.
 */

const COUNT_THRESHOLD_SECONDS = 30;
/** A jump larger than this between timeupdates is a seek, not listening. */
const MAX_NATURAL_STEP_SECONDS = 2;

function sessionId(): string {
  const key = "vibebanger:sid";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    // Storage unavailable: a per-page id still lets plays be recorded.
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function send(method: "POST" | "PATCH", body: unknown, keepalive = false) {
  return fetch("/api/events/play", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Lets the final flush survive the page being closed.
    keepalive,
  });
}

export class PlayTracker {
  private playId: Promise<string | null> | null = null;
  private duration = 0;
  private listened = 0;
  private lastMediaTime: number | null = null;
  private countReported = false;
  private completeReported = false;

  start(trackId: string, durationSeconds: number) {
    this.flush();

    this.duration = durationSeconds;
    this.listened = 0;
    this.lastMediaTime = null;
    this.countReported = false;
    this.completeReported = false;

    this.playId = send("POST", { trackId, sessionId: sessionId() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.playId as string | undefined) ?? null)
      .catch(() => null);
  }

  /** Call on every timeupdate while a track is loaded. */
  onTimeUpdate(mediaTime: number, isPlaying: boolean) {
    if (!this.playId) return;

    if (isPlaying && this.lastMediaTime !== null) {
      const step = mediaTime - this.lastMediaTime;
      if (step > 0 && step <= MAX_NATURAL_STEP_SECONDS) this.listened += step;
    }
    this.lastMediaTime = mediaTime;

    if (!this.countReported && this.listened >= this.threshold()) {
      this.countReported = true;
      void this.report();
    }
  }

  onEnded() {
    if (!this.playId || this.completeReported) return;
    this.completeReported = true;
    void this.report({ completed: true });
  }

  /** Send the final listened figure for the current play, if any. */
  flush(keepalive = false) {
    if (!this.playId) return;
    void this.report({ keepalive });
    this.playId = null;
  }

  private threshold() {
    return this.duration > 0 ? Math.min(COUNT_THRESHOLD_SECONDS, this.duration / 2) : COUNT_THRESHOLD_SECONDS;
  }

  private async report(opts: { completed?: boolean; keepalive?: boolean } = {}) {
    const pending = this.playId;
    const listened = this.listened;
    if (!pending) return;
    const playId = await pending;
    if (!playId) return;
    try {
      await send(
        "PATCH",
        { playId, progressSeconds: listened, completed: opts.completed === true },
        opts.keepalive
      );
    } catch {
      // Analytics are best-effort; playback must never depend on them.
    }
  }
}
