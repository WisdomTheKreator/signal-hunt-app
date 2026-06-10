import { put } from "@vercel/blob";

/**
 * Uploads a video file to Vercel Blob storage
 * @param {File} file - Video file to upload
 * @param {string} onUploadComplete - Callback when upload completes
 * @returns {Promise<string>} - URL of uploaded blob
 */
export async function uploadDemoVideo(file) {
  if (!file) throw new Error("No file provided");

  const token = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Vercel Blob token not configured");
  }

  try {
    const blob = await put(`demo-video-${Date.now()}.mp4`, file, {
      access: "public",
      token: token,
    });

    console.log("Video uploaded successfully:", blob.url);
    return blob.url;
  } catch (error) {
    console.error("Failed to upload video:", error);
    throw error;
  }
}

/**
 * Example: Upload video from your admin panel or CI/CD
 * You can call this function from an admin page or script
 */
export async function uploadDemoVideoFromUrl(videoUrl) {
  const token = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Vercel Blob token not configured");
  }

  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    
    const uploaded = await put("signal-hunt-demo.mp4", blob, {
      access: "public",
      token: token,
    });

    console.log("Demo video uploaded:", uploaded.url);
    return uploaded.url;
  } catch (error) {
    console.error("Failed to upload demo video:", error);
    throw error;
  }
}
