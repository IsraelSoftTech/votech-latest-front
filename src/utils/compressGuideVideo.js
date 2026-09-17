import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";

/** Stored / uploaded user-guide videos must fit this ceiling. */
export const GUIDE_VIDEO_MAX_BYTES = 15 * 1024 * 1024;

/** Hard cap on the original file the admin may pick; larger clips go in as a link. */
export const GUIDE_VIDEO_SOURCE_MAX_BYTES = 200 * 1024 * 1024;

const AUDIO_BITRATE = 64_000;

function even(value) {
  const n = Math.max(2, Math.round(Number(value) || 0));
  return n % 2 === 0 ? n : n - 1;
}

function videoSettingsForDuration(duration) {
  if (duration > 360) return { width: 640, frameRate: 12 };
  if (duration > 180) return { width: 854, frameRate: 15 };
  if (duration > 90) return { width: 960, frameRate: 18 };
  return { width: 1280, frameRate: 20 };
}

/**
 * Re-encodes a user-guide video to at most `maxBytes` using WebCodecs.
 * Runs until the file is ready — there is no time cutoff.
 */
export async function compressGuideVideo(file, { maxBytes = GUIDE_VIDEO_MAX_BYTES, onProgress } = {}) {
  if (!file) throw new Error("No video selected");
  if (file.size <= maxBytes) {
    onProgress?.(100);
    return file;
  }
  if (file.size > GUIDE_VIDEO_SOURCE_MAX_BYTES) {
    throw new Error(
      `Videos larger than ${Math.round(GUIDE_VIDEO_SOURCE_MAX_BYTES / (1024 * 1024))}MB cannot be processed here. Add them as a link instead.`
    );
  }

  onProgress?.(2);

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  const duration = await input.computeDuration();
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not read the video file.");
  }

  const { width: maxWidth, frameRate } = videoSettingsForDuration(duration);
  const videoTrack = await input.getPrimaryVideoTrack();
  const srcWidth = videoTrack ? await videoTrack.getDisplayWidth() : maxWidth;
  const outWidth = even(Math.min(maxWidth, srcWidth || maxWidth));

  const budgetBits = maxBytes * 8 * 0.68;
  const videoBitrate = Math.max(
    180_000,
    Math.floor(budgetBits / duration) - AUDIO_BITRATE
  );

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target,
  });

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    showWarnings: false,
    copy: false,
    tags: {},
    video: {
      width: outWidth,
      fit: "contain",
      frameRate,
      codec: "avc",
      hardwareAcceleration: "prefer-hardware",
      keyFrameInterval: 5,
      forceTranscode: true,
      quality: new Quality({
        bitrate: videoBitrate,
        bitrateMode: "constant",
      }),
    },
    audio: {
      codec: "aac",
      numberOfChannels: 1,
      sampleRate: 44100,
      quality: new Quality({
        bitrate: AUDIO_BITRATE,
        bitrateMode: "constant",
      }),
    },
  });

  if (!conversion.isValid) {
    throw new Error("This video format could not be compressed. Add it as a link instead.");
  }

  conversion.onProgress = (progress) => {
    onProgress?.(Math.max(3, Math.min(99, Math.round(progress * 100))));
  };

  try {
    await conversion.execute();
  } catch (err) {
    throw new Error(err?.message || "Video compression failed. Try another file or add it as a link.");
  }

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("Video compression produced an empty file. Try another clip or add it as a link.");
  }
  if (buffer.byteLength > maxBytes) {
    throw new Error("The video could not be reduced to 15MB. Try a shorter clip or add it as a link.");
  }

  const baseName = (file.name || "guide-video").replace(/\.[^.]+$/, "") || "guide-video";
  onProgress?.(100);
  return new File([buffer], `${baseName}.mp4`, {
    type: "video/mp4",
    lastModified: Date.now(),
  });
}
