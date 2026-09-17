/**
 * PUTs a file to a presigned URL with upload progress. XHR rather than fetch
 * because fetch still can't report upload progress in browsers.
 *
 * Content-Type must match what the URL was signed with, or R2 rejects it.
 */
export function xhrPut(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
