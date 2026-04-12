import { howToGuides } from "./howToData.js";
import { STORAGE_KEYS } from "./constants.js";

export function initWikiManager() {
  const modal = document.getElementById("wiki-modal");
  const openBtn = document.getElementById("btn-open-wiki");
  const closeBtn = document.getElementById("wiki-close-btn");
  const searchInput = document.getElementById("wiki-search");
  const listContainer = document.getElementById("wiki-list");
  const favFilterBtn = document.getElementById("btn-wiki-filter-fav");

  if (!modal || !openBtn || !listContainer) return;

  let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.WIKI_FAVORITES) || "[]");
  let showFavoritesOnly = false;

  function renderList(filterText = "") {
    listContainer.innerHTML = "";
    const lowerFilter = filterText.toLowerCase();

    let filtered = howToGuides.filter((guide) => {
      // Search in title, category, and steps (text content)
      const inTitle = guide.title.toLowerCase().includes(lowerFilter);
      const inCategory = guide.category.toLowerCase().includes(lowerFilter);
      const inSteps = guide.steps
        ? guide.steps.some((step) => {
            const text = typeof step === "string" ? step : step.text || "";
            return text.toLowerCase().includes(lowerFilter);
          })
        : false;
      return inTitle || inCategory || inSteps;
    });

    if (showFavoritesOnly) {
      filtered = filtered.filter((guide) => favorites.includes(guide.id));
    }

    // Sort: Favorites first
    filtered.sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML =
        "<div style='padding:15px; text-align:center; color:var(--text-color); opacity:0.7;'>No results found.</div>";
      return;
    }

    filtered.forEach((guide) => {
      const isFav = favorites.includes(guide.id);
      const item = document.createElement("div");
      item.className = "wiki-item";
      item.style.borderBottom = "1px solid var(--border-color, #eee)";

      const header = document.createElement("div");
      header.className = "wiki-header";
      header.style.padding = "12px";
      header.style.cursor = "pointer";
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="fav-star" style="cursor: pointer; color: ${
            isFav ? "#FFD700" : "var(--text-color); opacity: 0.3;"
          }; font-size: 1.2em;">${isFav ? "★" : "☆"}</span>
          <span style="font-weight:bold; color:var(--text-color);">${
            guide.title
          }</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size:0.75em; background:var(--button-bg); padding:2px 6px; border-radius:4px; border:1px solid var(--border-color);">${
            guide.category
          }</span>
          <span class="share-icon" style="cursor: pointer; font-size: 1.1em;" title="Share Guide">📤</span>
        </div>
      `;

      const content = document.createElement("div");
      content.className = "wiki-content hidden";
      content.style.padding = "0 12px 12px 12px";
      content.style.fontSize = "0.9em";
      content.style.color = "var(--text-color)";

      if (guide.steps) {
        const ul = document.createElement("ul");
        ul.style.paddingLeft = "20px";
        ul.style.margin = "5px 0 0 0";
        guide.steps.forEach((step) => {
          const li = document.createElement("li");
          li.style.marginBottom = "8px";

          if (typeof step === "string") {
            li.textContent = step;
          } else if (typeof step === "object") {
            if (step.text) {
              const textDiv = document.createElement("div");
              textDiv.textContent = step.text;
              li.appendChild(textDiv);
            }
            if (step.image) {
              const img = document.createElement("img");
              img.src = step.image;
              img.style.maxWidth = "100%";
              img.style.marginTop = "5px";
              img.style.borderRadius = "4px";
              img.style.cursor = "zoom-in";
              img.onclick = (e) => {
                e.stopPropagation();
                if (window.showLightbox)
                  window.showLightbox(step.image, step.text);
              };
              li.appendChild(img);
            }
          }

          ul.appendChild(li);
        });
        content.appendChild(ul);
      } else if (guide.content) {
        const p = document.createElement("p");
        p.textContent = guide.content;
        content.appendChild(p);
      }

      // Handle Star Click
      const star = header.querySelector(".fav-star");
      star.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(guide.id);
      });

      // Handle Share Click
      const shareIcon = header.querySelector(".share-icon");
      shareIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        shareGuide(guide);
      });

      header.addEventListener("click", (e) => {
        // Prevent toggling if clicking star (handled above, but just in case)
        if (
          e.target.classList.contains("fav-star") ||
          e.target.classList.contains("share-icon")
        )
          return;

        const isHidden = content.classList.contains("hidden");
        if (isHidden) {
          content.classList.remove("hidden");
          header.style.backgroundColor = "var(--hover-bg, rgba(0,0,0,0.05))";
        } else {
          content.classList.add("hidden");
          header.style.backgroundColor = "transparent";
        }
      });

      item.appendChild(header);
      item.appendChild(content);
      listContainer.appendChild(item);
    });
  }

  function toggleFavorite(id) {
    if (favorites.includes(id)) {
      favorites = favorites.filter((favId) => favId !== id);
    } else {
      favorites.push(id);
    }
    localStorage.setItem(STORAGE_KEYS.WIKI_FAVORITES, JSON.stringify(favorites));
    renderList(searchInput ? searchInput.value : "");
  }

  function shareGuide(guide) {
    let text = `📚 ${guide.title}\n\n`;
    if (guide.steps) {
      guide.steps.forEach((step, index) => {
        const stepText = typeof step === "string" ? step : step.text || "";
        text += `${index + 1}. ${stepText}\n`;
      });
    } else if (guide.content) {
      text += guide.content;
    }

    if (navigator.share) {
      navigator.share({ title: guide.title, text: text }).catch((err) => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert("Guide copied to clipboard!");
      });
    }
  }

  openBtn.addEventListener("click", () => {
    modal.classList.add("active");
    renderList(searchInput ? searchInput.value : "");
    if (searchInput) searchInput.focus();
  });

  const closeModal = () => modal.classList.remove("active");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderList(e.target.value);
    });
  }

  if (favFilterBtn) {
    favFilterBtn.addEventListener("click", () => {
      showFavoritesOnly = !showFavoritesOnly;
      favFilterBtn.textContent = showFavoritesOnly ? "★" : "☆";
      favFilterBtn.style.color = showFavoritesOnly ? "#FFD700" : "";
      favFilterBtn.style.borderColor = showFavoritesOnly ? "#FFD700" : "";
      renderList(searchInput ? searchInput.value : "");
    });
  }
}
