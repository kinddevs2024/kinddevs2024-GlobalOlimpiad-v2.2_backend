/**
 * Combined Camera and Screen Video Capture Utility
 * Records continuous video from both camera and screen,
 * combines them side-by-side, and uploads as MP4
 *
 * Usage:
 *   const capture = new ScreenshotCapture(olympiadId, authToken);
 *   await capture.start(); // Start recording video
 *   await capture.stop();  // Stop and upload final video
 */

class ScreenshotCapture {
  constructor(olympiadId, authToken, captureType = "both", options = {}) {
    this.olympiadId = olympiadId;
    this.authToken = authToken;
    this.captureType = captureType; // 'both', 'screen', or 'camera'
    this.apiUrl = "/api/olympiads/upload-video";

    // Video recording options
    this.chunkInterval = options.chunkInterval || 10000; // Upload every 10 seconds
    this.videoBitsPerSecond = options.videoBitsPerSecond || 1000000; // 1 Mbps
    this.mimeType = options.mimeType || "video/webm;codecs=vp8,opus";

    // State
    this.screenStream = null;
    this.cameraStream = null;
    this.screenVideo = null;
    this.cameraVideo = null;
    this.canvas = null;
    this.ctx = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isCapturing = false;
    this.chunkTimer = null;
    this.startTime = null;
    this.animationFrame = null;
  }

  // Start recording video from camera and screen
  async start() {
    if (this.isCapturing) {
      console.warn("Video recording is already running");
      return;
    }

    try {
      // Get screen stream
      if (this.captureType === "both" || this.captureType === "screen") {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: "screen",
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
          },
          audio: false,
        });

        // Create and setup screen video element
        this.screenVideo = document.createElement("video");
        this.screenVideo.srcObject = this.screenStream;
        this.screenVideo.autoplay = true;
        this.screenVideo.playsInline = true;
        this.screenVideo.muted = true;

        // Wait for video to be ready
        await new Promise((resolve) => {
          this.screenVideo.onloadedmetadata = () => {
            this.screenVideo.play().then(resolve);
          };
        });

        // Handle screen stream end
        this.screenStream.getVideoTracks()[0].onended = () => {
          console.log("Screen stream ended by user");
          this.stop();
        };
      }

      // Get camera stream
      if (this.captureType === "both" || this.captureType === "camera") {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
          },
          audio: false,
        });

        // Create and setup camera video element
        this.cameraVideo = document.createElement("video");
        this.cameraVideo.srcObject = this.cameraStream;
        this.cameraVideo.autoplay = true;
        this.cameraVideo.playsInline = true;
        this.cameraVideo.muted = true;

        // Wait for video to be ready
        await new Promise((resolve) => {
          this.cameraVideo.onloadedmetadata = () => {
            this.cameraVideo.play().then(resolve);
          };
        });
      }

      // Create canvas for combining streams
      this.canvas = document.createElement("canvas");
      this.canvas.width = 1280; // 720p width
      this.canvas.height = 720; // 720p height
      this.ctx = this.canvas.getContext("2d");

      // Fill background
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Wait a bit for videos to start playing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get canvas stream for MediaRecorder
      const canvasStream = this.canvas.captureStream(30); // 30 fps

      // Check if MediaRecorder supports the mime type
      if (!MediaRecorder.isTypeSupported(this.mimeType)) {
        const alternatives = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4",
        ];
        this.mimeType =
          alternatives.find((type) => MediaRecorder.isTypeSupported(type)) ||
          "";
        if (!this.mimeType) {
          throw new Error(
            "MediaRecorder API not supported or no compatible codec found"
          );
        }
        console.log(`Using MIME type: ${this.mimeType}`);
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: this.mimeType,
        videoBitsPerSecond: this.videoBitsPerSecond,
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          console.log(`Video chunk received: ${event.data.size} bytes`);
        }
      };

      // Handle stop
      this.mediaRecorder.onstop = () => {
        console.log("Recording stopped");
        this.uploadVideo();
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
      };

      // Start drawing frames to canvas
      this.startDrawing();

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every 1 second
      this.isCapturing = true;
      this.startTime = Date.now();

      console.log(`Started ${this.captureType} video recording at 720p`);

      // Set up periodic chunk uploads
      if (this.chunkInterval > 0) {
        this.chunkTimer = setInterval(() => {
          this.uploadChunk();
        }, this.chunkInterval);
      }
    } catch (error) {
      console.error("Error starting video recording:", error);
      throw error;
    }
  }

  // Draw frames from video elements to canvas
  startDrawing() {
    const draw = () => {
      if (!this.isCapturing || !this.ctx) return;

      // Clear canvas
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw screen (left side, scaled to fit 720p)
      if (
        this.screenVideo &&
        this.screenStream &&
        this.screenStream.active &&
        this.screenVideo.readyState >= 2
      ) {
        try {
          // Scale screen to fit 720p (1280x720)
          this.ctx.drawImage(this.screenVideo, 0, 0, 1280, 720);
        } catch (err) {
          console.warn("Error drawing screen:", err);
        }
      }

      // Draw camera (overlay on bottom right corner)
      if (
        this.cameraVideo &&
        this.cameraStream &&
        this.cameraStream.active &&
        this.cameraVideo.readyState >= 2
      ) {
        try {
          // Draw camera as small overlay in bottom right (320x240)
          const overlayWidth = 320;
          const overlayHeight = 240;
          const x = this.canvas.width - overlayWidth - 10;
          const y = this.canvas.height - overlayHeight - 10;
          this.ctx.drawImage(
            this.cameraVideo,
            x,
            y,
            overlayWidth,
            overlayHeight
          );
        } catch (err) {
          console.warn("Error drawing camera:", err);
        }
      }

      this.animationFrame = requestAnimationFrame(draw);
    };

    draw();
  }

  // Upload current chunk (periodic upload)
  async uploadChunk() {
    if (this.recordedChunks.length === 0) {
      return;
    }

    try {
      const blob = new Blob(this.recordedChunks, { type: this.mimeType });

      if (blob.size === 0) {
        return;
      }

      await this.uploadVideo(blob, true); // true = is chunk

      // Clear chunks after successful upload (keep last chunk for continuity)
      if (this.recordedChunks.length > 1) {
        const lastChunk = this.recordedChunks[this.recordedChunks.length - 1];
        this.recordedChunks = [lastChunk];
      }
    } catch (error) {
      console.error("Error uploading chunk:", error);
    }
  }

  // Upload video to API
  async uploadVideo(blob = null, isChunk = false) {
    try {
      if (!blob) {
        if (this.recordedChunks.length === 0) {
          console.warn("No video data to upload");
          return;
        }
        blob = new Blob(this.recordedChunks, { type: this.mimeType });
      }

      if (blob.size === 0) {
        console.warn("Video blob is empty");
        return;
      }

      const formData = new FormData();
      const fileName = isChunk
        ? `${this.captureType}-chunk-${Date.now()}.webm`
        : `${this.captureType}-${Date.now()}.webm`;

      formData.append("video", blob, fileName);
      formData.append("olympiadId", this.olympiadId);
      formData.append("captureType", this.captureType);

      console.log(
        `Uploading ${isChunk ? "chunk" : "video"} (${(
          blob.size /
          1024 /
          1024
        ).toFixed(2)} MB)...`
      );

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Upload failed: ${response.statusText} - ${errorData.message || ""}`
        );
      }

      const result = await response.json();
      console.log(
        `${isChunk ? "Chunk" : "Video"} uploaded successfully: ${
          result.captureId
        }`
      );
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  // Stop recording and upload final video
  async stop() {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;

    // Stop drawing
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Clear chunk timer
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    // Clean up canvas
    if (this.ctx) {
      this.ctx = null;
    }
    if (this.canvas) {
      this.canvas = null;
    }

    // Clean up video elements
    if (this.screenVideo) {
      this.screenVideo.srcObject = null;
      this.screenVideo = null;
    }

    if (this.cameraVideo) {
      this.cameraVideo.srcObject = null;
      this.cameraVideo = null;
    }

    // Stop all streams
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }

    // Upload will happen in onstop handler
  }

  // Get current status
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      chunkInterval: this.chunkInterval / 1000, // in seconds
      captureType: this.captureType,
      olympiadId: this.olympiadId,
      recordingTime: this.startTime ? Date.now() - this.startTime : 0,
      chunksRecorded: this.recordedChunks.length,
      totalSize: this.recordedChunks.reduce(
        (sum, chunk) => sum + chunk.size,
        0
      ),
    };
  }
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ScreenshotCapture;
}

// Export for ES6 modules
export default ScreenshotCapture;
