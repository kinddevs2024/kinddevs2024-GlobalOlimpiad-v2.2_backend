/**
 * React Hook for Combined Camera and Screen Capture
 * Captures photos from both camera and screen every 0.5 seconds,
 * combines them, and converts to video
 * 
 * Usage:
 *   const { start, stop, isCapturing, recordingTime } = useScreenshotCapture(
 *     olympiadId, 
 *     authToken, 
 *     'both', // 'both', 'screen', or 'camera'
 *     true, // enabled
 *     { captureInterval: 500, uploadInterval: 10000 } // options
 *   );
 */

import { useEffect, useRef, useState } from 'react';
import ScreenshotCapture from './screenshot-capture.js';

function useScreenshotCapture(olympiadId, authToken, captureType = 'both', enabled = true, options = {}) {
  const captureRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    if (!enabled || !olympiadId || !authToken) {
      if (captureRef.current && isCapturing) {
        captureRef.current.stop();
        setIsCapturing(false);
      }
      return;
    }

    // Start recording when enabled
    const startRecording = async () => {
      try {
        const capture = new ScreenshotCapture(olympiadId, authToken, captureType, options);
        captureRef.current = capture;
        await capture.start();
        setIsCapturing(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    };

    startRecording();

    return () => {
      if (captureRef.current && isCapturing) {
        captureRef.current.stop();
        setIsCapturing(false);
      }
    };
  }, [olympiadId, authToken, captureType, enabled]);

  // Update recording time
  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(() => {
      if (captureRef.current) {
        const status = captureRef.current.getStatus();
        setRecordingTime(status.recordingTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCapturing]);

  const start = async () => {
    if (captureRef.current && !isCapturing) {
      try {
        await captureRef.current.start();
        setIsCapturing(true);
      } catch (error) {
        console.error('Failed to start:', error);
      }
    }
  };

  const stop = async () => {
    if (captureRef.current && isCapturing) {
      await captureRef.current.stop();
      setIsCapturing(false);
      setRecordingTime(0);
    }
  };

  const setCaptureInterval = (ms) => {
    if (captureRef.current) {
      captureRef.current.setCaptureInterval(ms);
    }
  };

  return {
    start,
    stop,
    isCapturing,
    recordingTime: Math.floor(recordingTime / 1000), // in seconds
    setCaptureInterval,
    status: captureRef.current?.getStatus() || null
  };
}

export default useScreenshotCapture;

