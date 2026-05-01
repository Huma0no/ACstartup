export function ouncesToPoundsAndOunces(oz) {
  return `${oz} oz (${(oz / 16).toFixed(2)} lb)`;
}

export function getSubcoolingDefault(modelNumber) {
  return String(modelNumber).startsWith("GL") ? 8 : 10;
}

export function calculateApproxAdjust(linesetLength, lineConfig) {
  if (isNaN(linesetLength) || !lineConfig) return null;

  let factoryLength = 15;
  if      (lineConfig.includes("10ft")) factoryLength = 10;
  else if (lineConfig.includes("25ft")) factoryLength = 25;
  else if (lineConfig.includes("30ft")) factoryLength = 30;
  else if (lineConfig.includes("15ft")) factoryLength = 15;

  const multiplier = lineConfig.toLowerCase().includes("trane") ? 0.47 : 0.6;
  return ((linesetLength - factoryLength) * multiplier).toFixed(2);
}

// ---------------------------------------------------------------------------
// Image utilities — lazy CDN loaders + GPS extraction + compression
// ---------------------------------------------------------------------------

let _exifrPromise = null;
function _loadExifr() {
  if (_exifrPromise) return _exifrPromise;
  _exifrPromise = new Promise((resolve, reject) => {
    if (window.exifr) return resolve(window.exifr);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/exifr/dist/full.umd.js";
    script.onload = () => resolve(window.exifr);
    script.onerror = (e) => { _exifrPromise = null; reject(e); };
    document.head.appendChild(script);
  });
  return _exifrPromise;
}

let _heic2anyPromise = null;
function _loadHeic2Any() {
  if (_heic2anyPromise) return _heic2anyPromise;
  _heic2anyPromise = new Promise((resolve, reject) => {
    if (window.heic2any) return resolve(window.heic2any);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js";
    script.onload = () => resolve(window.heic2any);
    script.onerror = (e) => { _heic2anyPromise = null; reject(e); };
    document.head.appendChild(script);
  });
  return _heic2anyPromise;
}

export async function getGpsFromImage(file) {
  if (!file) return null;
  try {
    await _loadExifr();
    const output = await window.exifr.gps(file);
    if (output && output.latitude && output.longitude) {
      return { lat: output.latitude.toFixed(6), lon: output.longitude.toFixed(6) };
    }
    return null;
  } catch (e) {
    console.warn("Error extracting GPS with exifr:", e);
    return null;
  }
}

export async function compressImage(file, quality = 0.8, maxWidth = 1600) {
  if (
    file.type.toLowerCase() === "image/heic" ||
    file.name.toLowerCase().endsWith(".heic")
  ) {
    try {
      await _loadHeic2Any();
      const convertedBlob = await window.heic2any({ blob: file, toType: "image/jpeg", quality });
      const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const newFile = new File(
        [resultBlob],
        file.name.replace(/\.heic$/i, ".jpg"),
        { type: "image/jpeg", lastModified: Date.now() }
      );
      return compressImage(newFile, quality, maxWidth);
    } catch (e) {
      console.error("HEIC conversion failed:", e);
      return file;
    }
  }

  if (!file.type.match(/image.*/)) return file;

  return new Promise((resolve) => {
    const img    = new Image();
    const reader = new FileReader();

    reader.onload  = (e) => { img.src = e.target.result; };
    reader.onerror = () => resolve(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width  = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width  = maxWidth;
      }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { console.warn("Image decoding failed, returning original."); resolve(file); };
    reader.readAsDataURL(file);
  });
}
