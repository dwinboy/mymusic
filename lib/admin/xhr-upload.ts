export function xhrUpload<T = unknown>(
  url: string,
  method: "POST" | "PATCH",
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<{ ok: boolean; status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: T;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {} as T;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}
