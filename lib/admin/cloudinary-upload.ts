export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
}

/** Direct browser → Cloudinary upload using a server-issued signature. Never touches our server. */
export async function uploadImageToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
  /** Creators sign through their own endpoint, which fixes the folder server-side. */
  signEndpoint = "/api/admin/uploads/image"
): Promise<CloudinaryUploadResult> {
  const sigRes = await fetch(signEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!sigRes.ok) throw new Error("Couldn't prepare the image upload.");
  const sig = await sigRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ publicId: data.public_id, secureUrl: data.secure_url, width: data.width, height: data.height });
      } else {
        reject(new Error("Cloudinary rejected the upload."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading the image."));
    xhr.send(formData);
  });
}
