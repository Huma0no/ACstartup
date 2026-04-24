import {
  loadJSZip,
  addGpsToImage,
  getGpsFromImage,
  compressImage,
} from "./fileUtils.js";
import { showLightbox } from "./ui.js";

const DB_NAME = "AppImagesDB";
const STORE_NAME = "images";

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const saveImageToDB = async (key, file, gps) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ file, gps, timestamp: Date.now() }, key);
  } catch (e) {
    console.error("Error saving to DB", e);
  }
};

const getImageFromDB = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const clearImagesFromDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (e) {
    console.error(e);
  }
};

export function initImageManager(context) {
  const { UI, getState, setState } = context;

  // Genera llave de DB prefijada con la dirección del job actual
  // Ej: "123_main_st_weight" — evita mezcla entre jobs
  const getDbKey = (key) => {
    const addr = getState().address || "default";
    const prefix = addr.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 24);
    return `${prefix}_${key}`;
  };

  // currentImages ahora incluye 'extras' que es un Map para manejo dinámico
  let currentImages = {
    weight: null,
    fan: null,
    weight2: null,
    fan2: null,
    extras: new Map(),
  };

  // Track whether the current set of images has been downloaded
  let _zipDownloaded = false;

  // Factory para crear inputs de imagen (reutilizable)
  const createFileInput = (label, key, onDelete = null) => {
    const uniqueId = `file-input-${key.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const wrapper = document.createElement("div");
    wrapper.className = "file-input-wrapper";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "stretch";

    // Input principal — abre cámara directamente en mobile
    const input = document.createElement("input");
    input.id = uniqueId;
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.className = "visually-hidden-input";
    input.dataset.imgInputKey = key;

    // Input galería — sin capture, abre el file picker normal
    const galleryInput = document.createElement("input");
    galleryInput.id = `${uniqueId}-gallery`;
    galleryInput.type = "file";
    galleryInput.accept = "image/*";
    galleryInput.className = "visually-hidden-input";

    // Fila superior: botón cámara + botón galería + delete (extras)
    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.gap = "6px";

    // Botón principal → cámara
    const btnEl = document.createElement("button");
    btnEl.type = "button";
    btnEl.textContent = label;
    btnEl.dataset.origLabel = label; // Guardado para restaurar en resetImages()
    btnEl.className = "btn btn-file-upload";
    btnEl.style.flex = "1";
    btnEl.style.marginBottom = "0";
    btnEl.onclick = (e) => { e.preventDefault(); input.click(); };

    // Botón galería → file picker
    const galleryBtn = document.createElement("button");
    galleryBtn.type = "button";
    galleryBtn.className = "btn";
    galleryBtn.textContent = "📁";
    galleryBtn.title = "Choose from gallery";
    galleryBtn.style.flexShrink = "0";
    galleryBtn.style.marginBottom = "0";
    galleryBtn.onclick = (e) => { e.preventDefault(); galleryInput.click(); };

    topRow.appendChild(btnEl);
    topRow.appendChild(galleryBtn);

    // Botón de eliminar para extras (en la fila superior)
    if (onDelete) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-delete";
      delBtn.style.position = "static";
      delBtn.style.flexShrink = "0";
      delBtn.textContent = "🗑️";
      delBtn.title = "Remove Photo";
      delBtn.onclick = onDelete;
      topRow.appendChild(delBtn);
    }

    // ── Preview helpers ──────────────────────────────────────
    let previewEl = null;
    let objectUrl = null;

    const clearPreview = () => {
      if (previewEl) { previewEl.remove(); previewEl = null; }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      btnEl.textContent = label;
      btnEl.classList.remove("active");
      btnEl.style.borderColor = "";
    };

    const showPreview = (file, gps, gpsSource) => {
      // Limpiar preview anterior si lo hay
      clearPreview();

      objectUrl = URL.createObjectURL(file);

      previewEl = document.createElement("div");
      previewEl.className = "img-preview";

      // Thumbnail
      const img = document.createElement("img");
      img.className = "img-thumb";
      img.src = objectUrl;
      img.alt = label;
      img.title = "Click to enlarge";
      img.addEventListener("click", () => showLightbox(objectUrl, label));

      // Meta
      const meta = document.createElement("div");
      meta.className = "img-preview-meta";

      const labelEl = document.createElement("span");
      labelEl.className = "img-preview-label";
      labelEl.textContent = label;

      const nameEl = document.createElement("span");
      nameEl.className = "img-preview-name";
      nameEl.textContent = file.name;

      meta.appendChild(labelEl);
      meta.appendChild(nameEl);

      if (gps) {
        const gpsChip = document.createElement("span");
        gpsChip.className = `img-gps-chip${gpsSource === "device" ? " gps-device" : ""}`;
        gpsChip.textContent = gpsSource === "device" ? "📍 GPS" : "📍 EXIF";
        gpsChip.title = gpsSource === "device"
          ? "Coordenadas del dispositivo"
          : "Coordenadas del EXIF de la foto";
        meta.appendChild(gpsChip);
      }

      // Botón ✕ para limpiar / re-seleccionar
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "img-clear-btn";
      clearBtn.textContent = "✕";
      clearBtn.title = "Remove photo";
      clearBtn.addEventListener("click", () => {
        // Limpiar datos
        if (key.startsWith("extra_")) {
          currentImages.extras.delete(key);
        } else {
          currentImages[key] = null;
          currentImages[key + "Gps"] = null;
          currentImages[key + "GpsSource"] = null;
        }
        input.value = "";
        clearPreview();
        updateDownloadButtonState();
      });

      previewEl.appendChild(img);
      previewEl.appendChild(meta);
      previewEl.appendChild(clearBtn);

      wrapper.appendChild(previewEl);

      // Marcar botón como activo / cambiar texto
      btnEl.textContent = "🔄 Change";
      btnEl.classList.add("active");
      btnEl.style.borderColor = "var(--button-bg-active)";
    };
    // ────────────────────────────────────────────────────────

    // Handler compartido por ambos inputs (cámara y galería)
    const handleFileSelected = async (e) => {
      if (!e.target.files || !e.target.files[0]) return;
      let file = e.target.files[0];

      btnEl.textContent = "⏳ Processing...";
      btnEl.classList.add("active");

      try {
        // 1. GPS del EXIF
        let gpsData = await getGpsFromImage(file);
        let gpsSource = gpsData ? "exif" : null;

        // 2. Fallback GPS del dispositivo
        if (!gpsData && navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
              });
            });
            gpsData = {
              lat: pos.coords.latitude.toFixed(6),
              lon: pos.coords.longitude.toFixed(6),
            };
            gpsSource = "device";
          } catch (err) {
            console.warn("GPS no disponible:", err);
          }
        }

        // 3. Comprimir / convertir a JPEG
        file = await compressImage(file, 0.8, 1600);

        // 4. Guardar en estado
        if (key.startsWith("extra_")) {
          currentImages.extras.set(key, { file, gps: gpsData });
        } else {
          currentImages[key] = file;
          currentImages[key + "Gps"] = gpsData;
          currentImages[key + "GpsSource"] = gpsSource;
        }

        saveImageToDB(getDbKey(key), file, gpsData);
        _zipDownloaded = false; // New image added — ZIP is now stale
        updateDownloadButtonState();

        // 5. Mostrar thumbnail
        showPreview(file, gpsData, gpsSource);

        // Resetear value para que el mismo archivo pueda seleccionarse de nuevo
        e.target.value = "";

      } catch (error) {
        console.error("Error procesando imagen:", error);
        btnEl.textContent = `❌ ${label} (Retry)`;
        btnEl.classList.remove("active");
        if (key.startsWith("extra_")) {
          currentImages.extras.delete(key);
        } else {
          currentImages[key] = null;
        }
      }
    };

    input.addEventListener("change", handleFileSelected);
    galleryInput.addEventListener("change", handleFileSelected);

    wrapper.appendChild(topRow);
    wrapper.appendChild(input);
    wrapper.appendChild(galleryInput);

    return wrapper;
  };

  // Función auxiliar para configurar contenedores fijos
  const setupImageInputs = (container, suffix = "", labelSuffix = "") => {
    if (!container) return;
    const section = document.createElement("div");
    section.className = "image-upload-section";
    section.appendChild(
      createFileInput(
        `📸 Weight Scale Image${labelSuffix} (oz)`,
        `weight${suffix}`
      )
    );
    section.appendChild(
      createFileInput(
        `📸 Fan Speed Setting Image${labelSuffix}`,
        `fan${suffix}`
      )
    );
    container.appendChild(section);
  };

  // --- MANEJO DE FOTOS EXTRA ---
  const renderExtraPhotoInput = (id, label) => {
    if (!UI.extraPhotosList) return;

    const onDelete = () => {
      // 1. Eliminar de State
      const currentState = getState();
      const newExtras = currentState.extraPhotos.filter((p) => p.id !== id);
      setState({ extraPhotos: newExtras });

      // 2. Eliminar de Memoria y DB
      currentImages.extras.delete(id);
      // Para borrar de DB necesitamos limpiar el registro, IndexedDB manual delete sería ideal pero
      // por simplicidad sobreescribimos con null o dejamos que el recolector de basura actúe en reset.

      // 3. Eliminar de UI
      const el = document.getElementById(`wrapper-${id}`);
      if (el) el.remove();

      updateDownloadButtonState();
    };

    const inputWrapper = createFileInput(label, id, onDelete);
    inputWrapper.id = `wrapper-${id}`;
    UI.extraPhotosList.appendChild(inputWrapper);
  };

  const addExtraPhoto = (label) => {
    const id = `extra_${Date.now()}`;
    const newItem = { id, label, timestamp: Date.now() };

    // Actualizar estado global
    const state = getState();
    setState({ extraPhotos: [...(state.extraPhotos || []), newItem] });

    // Renderizar UI — el usuario elige cámara (📸) o galería (📁)
    renderExtraPhotoInput(id, label);
  };

  // Inicializar inputs para Sistema 1
  if (UI.weightInContent) {
    setupImageInputs(UI.weightInContent, "", "");
  }

  // Inicializar inputs para Sistema 2
  if (UI.weightInSystem2) {
    setupImageInputs(UI.weightInSystem2, "2", " (Sys 2)");
  }

  // Botón de descarga único (Global)
  const downloadBtn = document.createElement("button");
  downloadBtn.id = "btn-download-images";
  downloadBtn.className = "btn btn-download-zip";
  downloadBtn.innerHTML = "💾 Download All Photos (ZIP)";
  downloadBtn.style.marginTop = "15px";
  downloadBtn.disabled = true;

  const safeModel = (model) =>
    model ? "_" + model.replace(/[^a-z0-9]/gi, "_").toUpperCase() : "";

  async function buildAndDownloadZip() {
    const state = getState();
    const safeAddress = (state.address || "Job")
      .replace(/[^a-z0-9]/gi, "_")
      .toUpperCase();

    const JSZip = await loadJSZip();
    const zip = new JSZip();

    const addToZip = async (key, suffix) => {
      let imgData = key.startsWith("extra_")
        ? currentImages.extras.get(key)
        : { file: currentImages[key], gps: currentImages[key + "Gps"] };
      if (!imgData?.file) return;
      let fileToSave = imgData.file;
      if (imgData.gps)
        fileToSave = await addGpsToImage(fileToSave, imgData.gps.lat, imgData.gps.lon);
      zip.file(`${safeAddress}${suffix}.jpg`, fileToSave);
    };

    await addToZip("weight",  "_WEIGHT"           + safeModel(state.outdoorModel));
    await addToZip("fan",     "_FAN"              + safeModel(state.heaterModel));
    await addToZip("weight2", "_WEIGHT_SYS2"      + safeModel(state.outdoorModel2));
    await addToZip("fan2",    "_FAN_SYS2"         + safeModel(state.heaterModel2));

    for (const photo of state.extraPhotos ?? []) {
      await addToZip(photo.id, "_" + photo.label.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase());
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(content),
      download: `${safeAddress}_PHOTOS.zip`,
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    _zipDownloaded = true;
  }

  downloadBtn.onclick = async (e) => {
    e.preventDefault();
    const hasImages =
      Object.values(currentImages).some((v) => v && !v.entries) ||
      currentImages.extras.size > 0;
    if (!hasImages) return;

    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = "⏳ Creando ZIP...";
    downloadBtn.disabled = true;
    try {
      await buildAndDownloadZip();
    } catch (err) {
      console.error(err);
      alert("Error al crear el ZIP de respaldo.");
    } finally {
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
    }
  };

  const updateDownloadButtonState = () => {
    const fixedCount = ["weight", "fan", "weight2", "fan2"]
      .filter(k => currentImages[k]).length;
    const total = fixedCount + currentImages.extras.size;
    const hasImages = total > 0;

    downloadBtn.disabled = !hasImages;
    downloadBtn.innerHTML = hasImages
      ? `💾 Download Photos (${total})`
      : `💾 Download All Photos`;
    downloadBtn.classList.toggle("has-images", hasImages);
  };

  // Insertar el botón de descarga al final de la sección principal
  // Preferiblemente después del contenedor del sistema 2 para que quede al final de todo
  if (UI.notesSection) {
    UI.notesSection.appendChild(downloadBtn);
  } else if (UI.weightInSystem2 && UI.weightInSystem2.parentNode) {
    UI.weightInSystem2.parentNode.appendChild(downloadBtn);
  } else if (UI.weightInContent) {
    UI.weightInContent.appendChild(downloadBtn);
  }

  // Restaurar imágenes guardadas al iniciar
  const loadSavedImages = async () => {
    const keys = ["weight", "fan", "weight2", "fan2"];
    for (const key of keys) {
      const data = await getImageFromDB(getDbKey(key));
      if (data && data.file) {
        currentImages[key] = data.file;
        currentImages[key + "Gps"] = data.gps;

        // Disparar preview en el wrapper correcto
        const input = document.getElementById(`file-input-${key}`);
        if (input) {
          const wrapper = input.closest(".file-input-wrapper");
          const btnEl = wrapper?.querySelector(".btn-file-upload");
          if (btnEl && wrapper) {
            // Crear thumbnail directamente (no tenemos gpsSource guardado, asumimos exif)
            const gpsSource = data.gps ? "exif" : null;
            _restorePreview(wrapper, btnEl, key, data.file, data.gps, gpsSource);
          }
        }
      }
    }

    // Restaurar fotos extra (basado en el estado)
    const state = getState();
    if (state.extraPhotos && state.extraPhotos.length > 0) {
      for (const photo of state.extraPhotos) {
        renderExtraPhotoInput(photo.id, photo.label);

        const data = await getImageFromDB(getDbKey(photo.id));
        if (data && data.file) {
          currentImages.extras.set(photo.id, { file: data.file, gps: data.gps });
          const input = document.getElementById(`file-input-${photo.id}`);
          const wrapper = input?.closest(".file-input-wrapper");
          const btnEl = wrapper?.querySelector(".btn-file-upload");
          if (btnEl && wrapper) {
            _restorePreview(wrapper, btnEl, photo.id, data.file, data.gps, data.gps ? "exif" : null);
          }
        }
      }
    }

    updateDownloadButtonState();
  };

  // Helper: crea thumbnail de restauración en un wrapper existente
  const _restorePreview = (wrapper, btnEl, key, file, gps, gpsSource) => {
    const objectUrl = URL.createObjectURL(file);

    const previewEl = document.createElement("div");
    previewEl.className = "img-preview";

    const img = document.createElement("img");
    img.className = "img-thumb";
    img.src = objectUrl;
    img.title = "Click to enlarge";
    img.addEventListener("click", () => showLightbox(objectUrl, key));

    const meta = document.createElement("div");
    meta.className = "img-preview-meta";

    const nameEl = document.createElement("span");
    nameEl.className = "img-preview-name";
    nameEl.textContent = `${file.name} (restored)`;
    meta.appendChild(nameEl);

    if (gps) {
      const gpsChip = document.createElement("span");
      gpsChip.className = `img-gps-chip${gpsSource === "device" ? " gps-device" : ""}`;
      gpsChip.textContent = gpsSource === "device" ? "📍 GPS" : "📍 EXIF";
      meta.appendChild(gpsChip);
    }

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "img-clear-btn";
    clearBtn.textContent = "✕";
    clearBtn.title = "Remove photo";
    clearBtn.addEventListener("click", () => {
      if (key.startsWith("extra_")) {
        currentImages.extras.delete(key);
      } else {
        currentImages[key] = null;
        currentImages[key + "Gps"] = null;
        currentImages[key + "GpsSource"] = null;
      }
      URL.revokeObjectURL(objectUrl);
      previewEl.remove();
      btnEl.textContent = btnEl.dataset.origLabel || "📸 Photo";
      btnEl.classList.remove("active");
      btnEl.style.borderColor = "";
      updateDownloadButtonState();
    });

    previewEl.appendChild(img);
    previewEl.appendChild(meta);
    previewEl.appendChild(clearBtn);
    wrapper.appendChild(previewEl);

    btnEl.textContent = "🔄 Change";
    btnEl.classList.add("active");
    btnEl.style.borderColor = "var(--button-bg-active)";
  };
  loadSavedImages();

  return {
    getCurrentImages: () => currentImages,
    addExtraPhoto,
    getUndownloadedCount: () => {
      if (_zipDownloaded) return 0;
      const fixed = ["weight", "fan", "weight2", "fan2"].filter(k => currentImages[k]).length;
      return fixed + currentImages.extras.size;
    },
    triggerDownload: () => downloadBtn.click(),
    downloadPhotos: buildAndDownloadZip,
    resetImages: () => {
      currentImages = {
        weight: null,
        fan: null,
        weight2: null,
        fan2: null,
        extras: new Map(),
      };
      _zipDownloaded = false;
      clearImagesFromDB(); // Limpiar DB al resetear

      // Limpiar inputs y thumbnails en ambos contenedores
      const containers = [UI.weightInContent, UI.weightInSystem2];
      containers.forEach((container) => {
        if (!container) return;
        container.querySelectorAll("input[type='file']").forEach((input) => {
          input.value = "";
        });
        container.querySelectorAll(".img-preview").forEach((preview) => {
          const img = preview.querySelector(".img-thumb");
          if (img?.src?.startsWith("blob:")) URL.revokeObjectURL(img.src);
          preview.remove();
        });
        container.querySelectorAll(".btn-file-upload").forEach((btn) => {
          btn.classList.remove("active");
          btn.style.borderColor = "";
          // Restore original label from data attribute if saved
          if (btn.dataset.origLabel) btn.textContent = btn.dataset.origLabel;
        });
      });

      // Limpiar extras UI
      if (UI.extraPhotosList) UI.extraPhotosList.innerHTML = "";

      // Deshabilitar botones de imagen
      // Usamos la referencia directa y quitamos la clase condicional
      downloadBtn.disabled = true;
      downloadBtn.classList.remove("has-images");
    },
  };
}
