/**
 * PUTs a file to a presigned URL with upload progress. XHR rather than fetch
 * because fetch still can't report upload progress in browsers.
 *
 * Content-Type must match what the URL was signed with, or R2 rejects it.
 *
 * Stall-detected rather than time-boxed overall: a large track on a slow
 * connection can legitimately take minutes, so a flat timeout would fail
 * uploads that were working. What actually needs catching is a connection
 * that stops moving — a dropped wifi handoff, a captive portal, a phone
 * that went to sleep mid-upload — where neither `onerror` nor `onload`
 * ever fires and the promise was hanging forever with no way out. The
 * timer resets on every progress event, so it only fires on true silence.
 */
const STALL_TIMEOUT_MS = 45_000;

export function xhrPut(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stallTimer: ReturnType<typeof setTimeout>;

    function armStallTimer() {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        xhr.abort();
        reject(new Error("The upload stalled — check your connection and try again."));
      }, STALL_TIMEOUT_MS);
    }

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      armStallTimer();
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      clearTimeout(stallTimer);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    };
    xhr.onerror = () => {
      clearTimeout(stallTimer);
      reject(new Error("Network error during upload"));
    };
    xhr.onabort = () => clearTimeout(stallTimer);
    armStallTimer(); // covers the gap before the first progress event too
    xhr.send(file);
  });
}
