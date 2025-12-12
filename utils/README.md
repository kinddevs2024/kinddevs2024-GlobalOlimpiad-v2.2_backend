# Capture Utilities

This directory contains utilities for automatic screenshot capture (every 5 seconds) and continuous video recording.

**Recommended: Use Video Capture** - Records continuous 720p MP4 videos (better for proctoring)

## Installation

For the html2canvas fallback method, install the package:

```bash
npm install html2canvas
```

## Usage

### Vanilla JavaScript

```javascript
import ScreenshotCapture from './utils/screenshot-capture.js';

// Create instance
const screenCapture = new ScreenshotCapture(
  'olympiad-id',      // Your olympiad ID
  'auth-token',       // JWT authentication token
  'screen'            // 'screen' or 'camera'
);

// Start capturing every 5 seconds
screenCapture.start();

// Stop capturing
screenCapture.stop();

// Change interval (in seconds)
screenCapture.setInterval(10); // Change to 10 seconds

// Get status
const status = screenCapture.getStatus();
console.log(status);
```

### React Hook

```javascript
import useScreenshotCapture from './utils/screenshot-capture-react.js';

function OlympiadPage({ olympiadId, authToken }) {
  const { start, stop, isCapturing, setInterval } = useScreenshotCapture(
    olympiadId,
    authToken,
    'screen',  // or 'camera'
    true       // enabled
  );

  return (
    <div>
      <p>Capture Status: {isCapturing ? 'Active' : 'Inactive'}</p>
      <button onClick={start} disabled={isCapturing}>
        Start Capture
      </button>
      <button onClick={stop} disabled={!isCapturing}>
        Stop Capture
      </button>
      <button onClick={() => setInterval(10)}>
        Change to 10 seconds
      </button>
    </div>
  );
}
```

### Example: Start on Olympiad Start

```javascript
import ScreenshotCapture from './utils/screenshot-capture.js';

let screenCapture = null;
let cameraCapture = null;

// When olympiad starts
function startOlympiad(olympiadId, authToken) {
  // Start screen capture
  screenCapture = new ScreenshotCapture(olympiadId, authToken, 'screen');
  screenCapture.start();

  // Start camera capture
  cameraCapture = new ScreenshotCapture(olympiadId, authToken, 'camera');
  cameraCapture.start();
}

// When olympiad ends
function stopOlympiad() {
  if (screenCapture) {
    screenCapture.stop();
    screenCapture = null;
  }
  if (cameraCapture) {
    cameraCapture.stop();
    cameraCapture = null;
  }
}
```

## Configuration

The default capture interval is **5 seconds**. You can change it:

```javascript
// Change to 10 seconds
capture.setInterval(10);

// Change to 3 seconds
capture.setInterval(3);
```

## Capture Types

- **'screen'**: Captures the entire screen/window
- **'camera'**: Captures from the user's camera

## Browser Permissions

- **Screen Capture**: Requires user permission (browser will prompt)
- **Camera Capture**: Requires user permission (browser will prompt)

## API Endpoint

Screenshots are uploaded to: `POST /api/olympiads/camera-capture`

Required fields:
- `image`: The image file (Blob/File)
- `olympiadId`: The olympiad ID
- `captureType`: 'screen' or 'camera'

Headers:
- `Authorization: Bearer {token}`

## Notes

- **Videos are recorded continuously** at 720p resolution
- Videos are uploaded as chunks every **30 seconds** (configurable)
- Final video is uploaded when recording stops
- Videos are automatically processed to 720p MP4 format on the backend
- Failed uploads are logged but don't stop the recording process
- The recording automatically stops when the component unmounts (React hook)

---

## Video Recording

### Vanilla JavaScript

```javascript
import VideoCapture from './utils/video-capture.js';

// Create instance
const videoRecorder = new VideoCapture(
  'olympiad-id',      // Your olympiad ID
  'auth-token',       // JWT authentication token
  'screen',           // 'screen' or 'camera'
  {
    chunkInterval: 30000,        // Upload chunk every 30 seconds (optional)
    videoBitsPerSecond: 1000000  // 1 Mbps bitrate (optional)
  }
);

// Start recording
await videoRecorder.start();

// Stop recording (will upload final video)
await videoRecorder.stop();

// Get status
const status = videoRecorder.getStatus();
console.log(status);
```

### React Hook

```javascript
import useVideoCapture from './utils/video-capture-react.js';

function OlympiadPage({ olympiadId, authToken }) {
  const { start, stop, isRecording, recordingTime } = useVideoCapture(
    olympiadId,
    authToken,
    'screen',  // or 'camera'
    true,      // enabled
    {
      chunkInterval: 30000 // Upload chunks every 30 seconds
    }
  );

  return (
    <div>
      <p>Recording: {isRecording ? 'Active' : 'Inactive'}</p>
      <p>Time: {recordingTime}s</p>
      <button onClick={start} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stop} disabled={!isRecording}>
        Stop Recording
      </button>
    </div>
  );
}
```

### Video Recording Features

- **Continuous recording**: Records video stream continuously (not screenshots)
- **Periodic uploads**: Uploads video chunks every 30 seconds (configurable)
- **Final upload**: Automatically uploads complete video when stopped
- **720p processing**: Backend automatically processes videos to 720p MP4
- **Screen & Camera**: Supports both screen and camera recording
- **Audio included**: Records audio along with video

### Video Recording Options

- `chunkInterval`: How often to upload video chunks (in milliseconds). Default: 30000 (30 seconds). Set to 0 to disable periodic uploads.
- `videoBitsPerSecond`: Video bitrate. Default: 1000000 (1 Mbps)
- `mimeType`: Video codec. Default: 'video/webm;codecs=vp8,opus'

### Example: Start on Olympiad Start

```javascript
import VideoCapture from './utils/video-capture.js';

let screenRecorder = null;
let cameraRecorder = null;

// When olympiad starts
async function startOlympiad(olympiadId, authToken) {
  // Start screen recording
  screenRecorder = new VideoCapture(olympiadId, authToken, 'screen', {
    chunkInterval: 30000 // Upload every 30 seconds
  });
  await screenRecorder.start();

  // Start camera recording
  cameraRecorder = new VideoCapture(olympiadId, authToken, 'camera', {
    chunkInterval: 30000
  });
  await cameraRecorder.start();
}

// When olympiad ends
async function stopOlympiad() {
  if (screenRecorder) {
    await screenRecorder.stop();
    screenRecorder = null;
  }
  if (cameraRecorder) {
    await cameraRecorder.stop();
    cameraRecorder = null;
  }
}
```

### Video Recording Notes

- Videos are recorded in WebM format and automatically converted to 720p MP4 on the backend
- Chunks are uploaded periodically to prevent data loss
- Final video is uploaded when recording stops
- Requires browser permissions for screen/camera access
- MediaRecorder API is required (supported in modern browsers)

