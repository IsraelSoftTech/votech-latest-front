const MAX_BYTES = 5 * 1024 * 1024;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImage(file, maxBytes = MAX_BYTES) {
  if (file.size <= maxBytes) return file;

  const img = await loadImageFromFile(file);
  let { width, height } = img;
  const maxDim = 1920;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob && blob.size > maxBytes && quality > 0.35) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  while (blob && blob.size > maxBytes && width > 480) {
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error('Image could not be compressed below 5MB. Try a smaller photo.');
  }

  const ext = outputType === 'image/png' ? '.png' : '.jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}${ext}`, { type: outputType, lastModified: Date.now() });
}

async function compressVideo(file, maxBytes = MAX_BYTES) {
  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      try {
        const stream = video.captureStream?.() || video.mozCaptureStream?.();
        if (!stream) {
          URL.revokeObjectURL(url);
          reject(new Error('Video is over 5MB. Please trim or compress it before sending.'));
          return;
        }

        const mimeTypes = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
        const chunks = [];
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 800_000 });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size > maxBytes) {
            reject(new Error('Video is still over 5MB after compression. Please use a shorter clip.'));
            return;
          }
          const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ext) || `video${ext}`, { type: mimeType }));
        };
        recorder.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Video compression failed. Please use a file under 5MB.'));
        };

        recorder.start(200);
        video.play();
        const duration = Math.min(video.duration || 30, 60);
        setTimeout(() => {
          recorder.stop();
          video.pause();
        }, duration * 1000);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(new Error('Video is over 5MB. Please trim or compress it before sending.'));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video file.'));
    };
    video.src = url;
  });
}

/** Prepare a chat attachment — images/videos compressed to ≤ 5MB when possible. */
export async function prepareChatMedia(file, maxBytes = MAX_BYTES) {
  if (!file) throw new Error('No file selected');
  if (file.size <= maxBytes) return file;

  if (file.type.startsWith('image/')) {
    return compressImage(file, maxBytes);
  }
  if (file.type.startsWith('video/')) {
    try {
      return await compressVideo(file, maxBytes);
    } catch {
      throw new Error('Video must be 5MB or less. Please trim your video and try again.');
    }
  }

  if (file.size > maxBytes) {
    throw new Error(`File must be ${maxBytes / (1024 * 1024)}MB or less.`);
  }
  return file;
}

export { MAX_BYTES as CHAT_MAX_FILE_BYTES };
