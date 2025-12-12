/**
 * Video Capture Utility
 * Records continuous video and uploads it periodically or at the end
 * 
 * Usage:
 *   const recorder = new VideoCapture(olympiadId, authToken, 'screen');
 *   await recorder.start(); // Start recording
 *   await recorder.stop();  // Stop and upload final video
 */

class VideoCapture {
  constructor(olympiadId, authToken, captureType = 'screen', options = {}) {
    this.olympiadId = olympiadId;
    this.authToken = authToken;
    this.captureType = captureType; // 'screen' or 'camera'
    this.apiUrl = '/api/olympiads/camera-capture';
    
    // Options
    this.chunkInterval = options.chunkInterval || 30000; // Upload every 30 seconds (default)
    this.videoBitsPerSecond = options.videoBitsPerSecond || 1000000; // 1 Mbps
    this.mimeType = options.mimeType || 'video/webm;codecs=vp8,opus';
    
    // State
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.chunkTimer = null;
    this.startTime = null;
  }

  // Start recording video
  async start() {
    if (this.isRecording) {
      console.warn('Video recording is already running');
      return;
    }

    try {
      // Get media stream at 720p resolution
      if (this.captureType === 'screen') {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen',
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 }
          },
          audio: true // Include system audio if available
        });
      } else if (this.captureType === 'camera') {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 }
          },
          audio: true
        });
      } else {
        throw new Error(`Unknown capture type: ${this.captureType}`);
      }

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported(this.mimeType)) {
        // Try alternative MIME types
        const alternatives = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ];
        
        this.mimeType = alternatives.find(type => MediaRecorder.isTypeSupported(type));
        if (!this.mimeType) {
          throw new Error('MediaRecorder API not supported or no compatible codec found');
        }
        console.log(`Using MIME type: ${this.mimeType}`);
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        videoBitsPerSecond: this.videoBitsPerSecond
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
        console.log('Recording stopped');
        this.uploadVideo();
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every 1 second
      this.isRecording = true;
      this.startTime = Date.now();
      
      console.log(`Started ${this.captureType} video recording`);

      // Set up periodic chunk uploads
      if (this.chunkInterval > 0) {
        this.chunkTimer = setInterval(() => {
          this.uploadChunk();
        }, this.chunkInterval);
      }

      // Handle stream end (user stops sharing)
      this.stream.getVideoTracks()[0].onended = () => {
        console.log('Stream ended by user');
        this.stop();
      };

    } catch (error) {
      console.error('Error starting video recording:', error);
      throw error;
    }
  }

  // Stop recording and upload final video
  async stop() {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    // Clear chunk timer
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Upload will happen in onstop handler
  }

  // Upload current chunk (periodic upload)
  async uploadChunk() {
    if (this.recordedChunks.length === 0) {
      return;
    }

    try {
      // Create blob from current chunks
      const blob = new Blob(this.recordedChunks, { type: this.mimeType });
      
      if (blob.size === 0) {
        return;
      }

      // Upload chunk
      await this.uploadVideo(blob, true); // true = is chunk

      // Clear chunks after successful upload (keep last chunk for continuity)
      if (this.recordedChunks.length > 1) {
        const lastChunk = this.recordedChunks[this.recordedChunks.length - 1];
        this.recordedChunks = [lastChunk]; // Keep last chunk for next segment
      }

    } catch (error) {
      console.error('Error uploading chunk:', error);
      // Don't clear chunks on error, will retry with next chunk
    }
  }

  // Upload complete video
  async uploadVideo(blob = null, isChunk = false) {
    try {
      // Create blob if not provided
      if (!blob) {
        if (this.recordedChunks.length === 0) {
          console.warn('No video data to upload');
          return;
        }
        blob = new Blob(this.recordedChunks, { type: this.mimeType });
      }

      if (blob.size === 0) {
        console.warn('Video blob is empty');
        return;
      }

      const formData = new FormData();
      const fileName = isChunk 
        ? `${this.captureType}-chunk-${Date.now()}.webm`
        : `${this.captureType}-${Date.now()}.webm`;
      
      formData.append('video', blob, fileName);
      formData.append('olympiadId', this.olympiadId);
      formData.append('captureType', this.captureType);

      console.log(`Uploading ${isChunk ? 'chunk' : 'video'} (${(blob.size / 1024 / 1024).toFixed(2)} MB)...`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.statusText} - ${errorData.message || ''}`);
      }

      const result = await response.json();
      console.log(`${isChunk ? 'Chunk' : 'Video'} uploaded successfully: ${result.captureId}`);
      return result;

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Get recording status
  getStatus() {
    return {
      isRecording: this.isRecording,
      captureType: this.captureType,
      olympiadId: this.olympiadId,
      recordingTime: this.startTime ? Date.now() - this.startTime : 0,
      chunksRecorded: this.recordedChunks.length,
      totalSize: this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoCapture;
}

// Export for ES6 modules
export default VideoCapture;

