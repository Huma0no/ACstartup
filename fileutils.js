// Cargar JSZip dinámicamente
let jsZipPromise = null;
export const loadJSZip = () => {
  if (jsZipPromise) return jsZipPromise;
  jsZipPromise = new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => resolve(window.JSZip);
    script.onerror = (e) => {
      jsZipPromise = null;
      reject(e);
    };
    document.head.appendChild(script);
  });
  return jsZipPromise;
};

// Cargar Piexifjs dinámicamente
let piexifPromise = null;
export const loadPiexif = () => {
  if (piexifPromise) return piexifPromise;
  piexifPromise = new Promise((resolve, reject) => {
    if (window.piexif) return resolve(window.piexif);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/piexifjs/1.0.6/piexif.js";
    script.onload = () => resolve(window.piexif);
    script.onerror = (e) => {
      piexifPromise = null;
      reject(e);
    };
    document.head.appendChild(script);
  });
  return piexifPromise;
};

// Cargar heic2any dinámicamente (Para conversión HEIC -> JPEG)
let heic2anyPromise = null;
export const loadHeic2Any = () => {
  if (heic2anyPromise) return heic2anyPromise;
  heic2anyPromise = new Promise((resolve, reject) => {
    if (window.heic2any) return resolve(window.heic2any);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js";
    script.onload = () => resolve(window.heic2any);
    script.onerror = (e) => {
      heic2anyPromise = null;
      reject(e);
    };
    document.head.appendChild(script);
  });
  return heic2anyPromise;
};

// Cargar exifr dinámicamente (Para leer GPS de HEIC y JPEG)
let exifrPromise = null;
export const loadExifr = () => {
  if (exifrPromise) return exifrPromise;
  exifrPromise = new Promise((resolve, reject) => {
    if (window.exifr) return resolve(window.exifr);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/exifr/dist/full.umd.js";
    script.onload = () => resolve(window.exifr);
    script.onerror = (e) => {
      exifrPromise = null;
      reject(e);
    };
    document.head.appendChild(script);
  });
  return exifrPromise;
};

// Inyectar GPS en imagen
export const addGpsToImage = async (file, lat, lon) => {
  if (!file || !file.type.includes("jpeg") || !lat || !lon) return file;
  try {
    await loadPiexif();
    const piexif = window.piexif;

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

    const latDMS = toDMS(parseFloat(lat));
    const lonDMS = toDMS(parseFloat(lon));
    const latRef = parseFloat(lat) >= 0 ? "N" : "S";
    const lonRef = parseFloat(lon) >= 0 ? "E" : "W";

    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

    let exifObj = { "0th": {}, Exif: {}, GPS: {} };
    try {
      exifObj = piexif.load(dataUrl);
    } catch (e) {}
    if (!exifObj["GPS"]) exifObj["GPS"] = {};

    exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = latDMS;
    exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lonRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = lonDMS;

    const exifStr = piexif.dump(exifObj);
    const newJpeg = piexif.insert(exifStr, dataUrl);
    const byteString = atob(newJpeg.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++)
      ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: "image/jpeg" });
  } catch (e) {
    console.error("Error injecting GPS:", e);
    return file;
  }
};

// Extraer GPS de imagen (Soporta JPEG y HEIC usando exifr)
export const getGpsFromImage = async (file) => {
  if (!file) return null;
  try {
    await loadExifr();
    // exifr.gps devuelve {latitude, longitude} directamente
    const output = await window.exifr.gps(file);
    if (output && output.latitude && output.longitude) {
      return {
        lat: output.latitude.toFixed(6),
        lon: output.longitude.toFixed(6),
      };
    }
    return null;
  } catch (e) {
    console.warn("Error extracting GPS with exifr:", e);
    return null;
  }
};

// Comprimir imagen
export const compressImage = async (file, quality = 0.7, maxWidth = 1600) => {
  // 1. Manejo especial para HEIC
  if (
    file.type.toLowerCase() === "image/heic" ||
    file.name.toLowerCase().endsWith(".heic")
  ) {
    try {
      await loadHeic2Any();
      const convertedBlob = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: quality,
      });
      // heic2any puede devolver un array si hay múltiples imágenes, tomamos la primera
      const resultBlob = Array.isArray(convertedBlob)
        ? convertedBlob[0]
        : convertedBlob;

      // Convertir el blob resultante a File para procesarlo recursivamente (redimensionar)
      const newFile = new File(
        [resultBlob],
        file.name.replace(/\.heic$/i, ".jpg"),
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      );
      // Llamada recursiva para asegurar el redimensionado (maxWidth)
      return compressImage(newFile, quality, maxWidth);
    } catch (e) {
      console.error("HEIC conversion failed:", e);
      return file; // Fallback al original si falla
    }
  }

  if (!file.type.match(/image.*/)) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            resolve(
              new File([blob], newName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    // Manejar errores de carga de imagen (ej. formato no soportado por el navegador)
    img.onerror = () => {
      console.warn("Image decoding failed, returning original.");
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
};
