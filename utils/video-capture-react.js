/**
 * React Hook for Video Capture
 * Automatically records video continuously
 *
 * Usage:
 *   const { start, stop, isRecording, recordingTime } = useVideoCapture(
 *     olympiadId,
 *     authToken,
 *     'screen',
 *     true, // enabled
 *     { chunkInterval: 30000 } // options
 *   );
 */

import { useEffect, useRef, useState } from "react";
import VideoCapture from "./video-capture.js";

function useVideoCapture(
  olympiadId,
  authToken,
  captureType = "screen",
  enabled = false,
  options = {}
) {
  const captureRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    if (!enabled || !olympiadId || !authToken) {
      if (captureRef.current && isRecording) {
        captureRef.current.stop();
        setIsRecording(false);
      }
      return;
    }

    // Start recording when enabled
    const startRecording = async () => {
      try {
        const capture = new VideoCapture(
          olympiadId,
          authToken,
          captureType,
          options
        );
        captureRef.current = capture;
        await capture.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
      }
    };

    startRecording();

    return () => {
      if (captureRef.current && isRecording) {
        captureRef.current.stop();
        setIsRecording(false);
      }
    };
  }, [olympiadId, authToken, captureType, enabled]);

  // Update recording time
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      if (captureRef.current) {
        const status = captureRef.current.getStatus();
        setRecordingTime(status.recordingTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const start = async () => {
    if (captureRef.current && !isRecording) {
      try {
        await captureRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start:", error);
      }
    }
  };

  const stop = async () => {
    if (captureRef.current && isRecording) {
      await captureRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  return {
    start,
    stop,
    isRecording,
    recordingTime: Math.floor(recordingTime / 1000), // in seconds
    status: captureRef.current?.getStatus() || null,
  };
}

export default useVideoCapture;
