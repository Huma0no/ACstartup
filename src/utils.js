import { FACTORY_LINE_CONFIGS } from "./data.js";

export function formatLbOz(oz) {
  if (isNaN(oz) || oz == null || oz === "") return "—";
  const num = parseFloat(oz);
  const lbs = Math.floor(num / 16);
  const remOz = parseFloat((num % 16).toFixed(2));
  if (lbs > 0 && remOz > 0) return `${lbs} lb ${remOz} oz`;
  if (lbs > 0) return `${lbs} lb`;
  return `${remOz} oz`;
}

export function ouncesToPoundsAndOunces(oz) {
  if (isNaN(oz) || oz == null || oz === "") return "—";
  const num = parseFloat(oz);
  const lbs = Math.floor(num / 16);
  const remOz = parseFloat((num % 16).toFixed(2));
  const lbOz = lbs > 0 && remOz > 0
    ? `${lbs} lb ${remOz} oz`
    : lbs > 0
    ? `${lbs} lb`
    : `${remOz} oz`;
  return `${num} oz (${lbOz})`;
}

export function getSubcoolingDefault(modelNumber) {
  return String(modelNumber).startsWith("GL") ? 8 : 10;
}

export function calculateApproxAdjust(linesetLength, lineConfig) {
  if (isNaN(linesetLength) || !lineConfig) return null;
  const cfg = FACTORY_LINE_CONFIGS[lineConfig];
  if (!cfg) return null;

  return ((linesetLength - cfg.factoryLength) * cfg.multiplier).toFixed(2);
}

export function calculateCFM(btu) {
  if (!btu) return null;
  const max = Math.round((btu / 12000) * 400);
  return { max, min: Math.round(max * 0.85) };
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

let _piexifPromise = null;
export function loadPiexif() {
  if (_piexifPromise) return _piexifPromise;
  _piexifPromise = new Promise((resolve, reject) => {
    if (window.piexif) return resolve(window.piexif);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/piexifjs/1.0.6/piexif.js";
    script.onload = () => resolve(window.piexif);
    script.onerror = (e) => { _piexifPromise = null; reject(e); };
    document.head.appendChild(script);
  });
  return _piexifPromise;
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

export async function getDeviceCoordinates(timeout = 6000) {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 30000,
      });
    });
    return {
      lat: pos.coords.latitude.toFixed(6),
      lon: pos.coords.longitude.toFixed(6),
    };
  } catch (e) {
    console.warn("Device GPS unavailable:", e);
    return null;
  }
}

export async function addGpsToImage(file, lat, lon) {
  if (!file || lat == null || lon == null) return file;
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) return file;

  try {
    await loadPiexif();
    const piexif = window.piexif;
    if (!piexif) return file;

    const toDMS = (deg) => {
      const d = Math.floor(Math.abs(deg));
      const minFloat = (Math.abs(deg) - d) * 60;
      const m = Math.floor(minFloat);
      const s = Math.round((minFloat - m) * 60 * 10000) / 10000;
      return [
        [d, 1],
        [m, 1],
        [Math.round(s * 10000), 10000],
      ];
    };

    const latDMS = toDMS(latNum);
    const lonDMS = toDMS(lonNum);
    const latRef = latNum >= 0 ? "N" : "S";
    const lonRef = lonNum >= 0 ? "E" : "W";

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    let exifObj = { "0th": {}, Exif: {}, GPS: {}, Interop: {}, "1st": {}, thumbnail: null };
    try {
      exifObj = piexif.load(dataUrl);
    } catch {
      // Clean structure if canvas JPEG has no existing EXIF
    }
    if (!exifObj["GPS"]) exifObj["GPS"] = {};

    exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
    exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = latDMS;
    exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lonRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = lonDMS;

    const exifStr = piexif.dump(exifObj);
    const newJpeg = piexif.insert(exifStr, dataUrl);
    const byteString = atob(newJpeg.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const originalName = file.name || "image.jpg";
    const newName = originalName.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([ab], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch (e) {
    console.error("Error injecting GPS into image:", e);
    return file;
  }
}

export async function processImageWithGps(file, quality = 0.8, maxWidth = 1600) {
  if (!file) return { file: null, gps: null, gpsSource: null };

  // 1. Try to extract GPS from EXIF of original file
  let gps = await getGpsFromImage(file);
  let gpsSource = gps ? "exif" : null;

  // 2. If no EXIF GPS, fallback to device coordinates in real time
  if (!gps) {
    const devCoords = await getDeviceCoordinates();
    if (devCoords) {
      gps = devCoords;
      gpsSource = "device";
    }
  }

  // 3. Compress & standardize image to JPEG
  let compressed = await compressImage(file, quality, maxWidth);

  // 4. Re-inject EXIF GPS metadata if coordinates are present
  if (gps && gps.lat && gps.lon) {
    compressed = await addGpsToImage(compressed, gps.lat, gps.lon);
  }

  return { file: compressed, gps, gpsSource };
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
