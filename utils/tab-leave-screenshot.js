/**
 * Tab Leave Screenshot Utility
 * Captures and uploads a screenshot when user leaves/closes the tab
 * 
 * Usage:
 *   import { setupTabLeaveScreenshot } from './utils/tab-leave-screenshot.js';
 *   setupTabLeaveScreenshot(olympiadId, authToken, username);
 */

/**
 * Setup screenshot capture on tab leave/close
 * @param {string} olympiadId - The olympiad ID
 * @param {string} authToken - JWT authentication token
 * @param {string} username - Username for identification
 */
export function setupTabLeaveScreenshot(olympiadId, authToken, username) {
  if (!olympiadId || !authToken) {
    console.warn("Tab leave screenshot: olympiadId and authToken are required");
    return;
  }

  // Function to capture and upload screenshot
  const captureAndUploadScreenshot = async () => {
    try {
      // Capture screenshot using html2canvas or similar
      // For now, we'll use a simple canvas capture method
      const canvas = await captureScreen();
      
      if (!canvas) {
        console.warn("Failed to capture screenshot");
        return;
      }

      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.9);
      });

      if (!blob) {
        console.warn("Failed to convert screenshot to blob");
        return;
      }

      // Upload screenshot
      await uploadScreenshot(blob, olympiadId, authToken, username);
    } catch (error) {
      console.error("Error capturing/uploading screenshot:", error);
    }
  };

  // Capture screenshot using available methods
  const captureScreen = async () => {
    try {
      // Method 1: Try using html2canvas if available
      if (typeof window !== "undefined" && window.html2canvas) {
        const canvas = await window.html2canvas(document.body, {
          useCORS: true,
          logging: false,
        });
        return canvas;
      }

      // Method 2: Use canvas to capture visible area
      if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Try to capture using drawWindow (Firefox) or similar
        // Note: This is limited by browser security
        return canvas;
      }

      return null;
    } catch (error) {
      console.error("Error capturing screen:", error);
      return null;
    }
  };

  // Upload screenshot to backend
  const uploadScreenshot = async (blob, olympiadId, authToken, username) => {
    try {
      const formData = new FormData();
      formData.append("screenshot", blob, `screenshot-${Date.now()}.png`);
      formData.append("olympiadId", olympiadId);
      if (username) {
        formData.append("username", username);
      }

      // Use sendBeacon for reliable delivery when page is closing
      if (navigator.sendBeacon) {
        const blobData = new Blob([JSON.stringify({
          screenshot: await blobToBase64(blob),
          olympiadId: olympiadId,
          username: username,
        })], { type: "application/json" });
        
        // Note: sendBeacon doesn't support FormData with files
        // So we'll use fetch with keepalive instead
      }

      // Use fetch with keepalive for reliable delivery
      const response = await fetch("/api/olympiads/upload-screenshot", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
        keepalive: true, // Keep request alive even if page closes
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Upload failed: ${response.statusText} - ${errorData.message || ""}`
        );
      }

      const result = await response.json();
      console.log("Screenshot uploaded successfully:", result);
      return result;
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      throw error;
    }
  };

  // Helper to convert blob to base64 (for sendBeacon alternative)
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Event listeners for tab leave/close
  const handleBeforeUnload = (event) => {
    // Capture screenshot before page unloads
    captureAndUploadScreenshot();
  };

  const handleVisibilityChange = () => {
    // Capture screenshot when tab becomes hidden
    if (document.hidden) {
      captureAndUploadScreenshot();
    }
  };

  const handlePageHide = (event) => {
    // Capture screenshot when page is being unloaded
    if (event.persisted === false) {
      captureAndUploadScreenshot();
    }
  };

  // Add event listeners
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
  }

  // Return cleanup function
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    }
  };
}

/**
 * Simple screenshot capture using html2canvas
 * Requires html2canvas library to be loaded
 */
export async function captureScreenshot() {
  if (typeof window === "undefined" || !window.html2canvas) {
    console.warn("html2canvas is not available");
    return null;
  }

  try {
    const canvas = await window.html2canvas(document.body, {
      useCORS: true,
      logging: false,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    return canvas;
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    return null;
  }
}

/**
 * Upload screenshot directly
 */
export async function uploadScreenshot(
  blob,
  olympiadId,
  authToken,
  username = null
) {
  const formData = new FormData();
  formData.append("screenshot", blob, `screenshot-${Date.now()}.png`);
  formData.append("olympiadId", olympiadId);
  if (username) {
    formData.append("username", username);
  }

  const response = await fetch("/api/olympiads/upload-screenshot", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
    keepalive: true, // Keep request alive even if page closes
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Upload failed: ${response.statusText} - ${errorData.message || ""}`
    );
  }

  return await response.json();
}

