import { SERVICES, OPTIONS, ACCESSORIES, FIXES } from "./src/data.js";
import { createChip } from "./ui.js";

export const Components = {
  Address: {
    render(UI, state) {
      if (UI.addressInput.value !== state.address) {
        UI.addressInput.value = state.address;
      }
    },
  },
  Services: {
    render(UI, state) {
      UI.serviceTypeButtons.querySelectorAll(".btn").forEach((btn) => {
        const service = btn.dataset.service;
        btn.classList.toggle(
          "active",
          state.selectedServices.some((s) => s.name === service)
        );
      });

      const showAcHeatOptions = state.selectedServices.some((s) =>
        [
          SERVICES.AC,
          SERVICES.HEAT,
          SERVICES.PRESTART,
          SERVICES.FINISH,
        ].includes(s.name)
      );
      UI.acHeatOptions.classList.toggle("hidden", !showAcHeatOptions);

      if (state.selectedServices.some((s) => s.name === SERVICES.CANCEL)) {
        UI.acHeatOptions
          .querySelectorAll(".btn")
          .forEach((btn) => btn.classList.remove("active"));
      } else {
        UI.acHeatOptions.querySelectorAll(".btn").forEach((btn) => {
          const option = btn.dataset.option;
          if (option === OPTIONS.TEMPORARY) {
            btn.classList.toggle("active", state.isTemporary);
          } else if (option === OPTIONS.TWO_SYSTEMS) {
            btn.classList.toggle("active", state.isTwoSystems);
          }
        });
      }
    },
  },
  Thermostat: {
    render(UI, state) {
      let matchedStandard = false;
      UI.thermostatButtons.querySelectorAll(".btn").forEach((btn) => {
        const thermostat = btn.dataset.thermostat;
        if (thermostat === "Otro") return; // Lo manejamos aparte

        const isActive =
          state.selectedThermostat &&
          state.selectedThermostat.name === thermostat;

        if (isActive) matchedStandard = true;
        btn.classList.toggle("active", isActive);
      });

      // Manejar botón "Otro" (+ Add New)
      const otroBtn = UI.thermostatButtons.querySelector(
        '[data-thermostat="Otro"]'
      );
      if (otroBtn) {
        // Activo si hay termostato seleccionado pero NO es uno de los estándar
        const isOtro = state.selectedThermostat && !matchedStandard;
        otroBtn.classList.toggle("active", isOtro);
      }

      // Mostrar slider si hay CUALQUIER termostato seleccionado
      if (state.selectedThermostat) {
        UI.thermostatQuantity.classList.remove("hidden");
        if (UI.quantitySelector) {
          const btns = UI.quantitySelector.querySelectorAll(".qty-btn");
          btns.forEach((btn) => {
            btn.classList.toggle(
              "active",
              parseInt(btn.dataset.qty) === state.thermostatQuantity
            );
          });
        }
      } else {
        UI.thermostatQuantity.classList.add("hidden");
      }
    },
  },
  Accessories: {
    render(UI, state) {
      UI.accessoryButtons.querySelectorAll(".btn").forEach((btn) => {
        const accessory = btn.dataset.accessory;
        btn.classList.toggle(
          "active",
          state.selectedAccessories.some((a) => a.name === accessory) ||
            (accessory === ACCESSORIES.OTRO && state.isOtroAccessoryOpen)
        );
      });

      UI.accessoryButtons
        .querySelectorAll("[data-toggle-target]")
        .forEach((btn) => {
          const target = btn.dataset.toggleTarget;
          const group = document.querySelector(target);
          if (!group) return;
          const hasActiveChild = Array.from(
            group.querySelectorAll(".btn")
          ).some((child) =>
            state.selectedAccessories.some(
              (a) => a.name === child.dataset.accessory
            )
          );
          const shouldShow = btn.classList.contains("active") || hasActiveChild;
          if (group.classList.contains("accessory-subgroup")) {
            group.classList.toggle("expanded", shouldShow);
          } else {
            group.classList.toggle("hidden", !shouldShow);
          }
        });

      // Render Custom Accessories List
      if (state.isOtroAccessoryOpen) {
        UI.accessoryOtro.classList.remove("hidden");
        UI.customAccessoriesList.innerHTML = "";
        state.customAccessories.forEach((item) => {
          const chip = createChip(
            `${item.name} $${item.basePrice}`,
            "accessory"
          );
          const removeBtn = document.createElement("span");
          removeBtn.textContent = " ✕";
          removeBtn.className = "chip-remove";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.marginLeft = "4px";
          removeBtn.dataset.id = item.id;
          chip.appendChild(removeBtn);
          UI.customAccessoriesList.appendChild(chip);
        });
      } else {
        UI.accessoryOtro.classList.add("hidden");
      }
    },
  },
  Fixes: {
    render(UI, state, helpers) {
      const { getAllFixButtons } = helpers;

      getAllFixButtons().forEach((btn) => {
        const fix = btn.dataset.fix;
        btn.classList.toggle(
          "active",
          state.selectedFixes.some((f) => f.name === fix) ||
            (fix === FIXES.OTRO && state.isOtroFixOpen)
        );
      });

      // Update Leaks group parent button + auto-expand if any leak sub-option active
      const leaksGroupBtn = UI.fixesSection.querySelector('[data-fix-group="leaks"]');
      const leaksSubGroup = document.getElementById("fix-group-leaks");
      const anyLeaks = state.selectedFixes.some((f) => f.name.startsWith("Leaks "));
      if (leaksGroupBtn) leaksGroupBtn.classList.toggle("active", anyLeaks);
      if (leaksSubGroup) {
        leaksSubGroup.classList.toggle("hidden", !anyLeaks);
        const arrow = leaksGroupBtn?.querySelector(".preset-arrow");
        if (arrow) arrow.textContent = anyLeaks ? "▴" : "▾";
      }

      // Render Custom Fixes List
      if (state.isOtroFixOpen) {
        UI.fixOtro.classList.remove("hidden");
        UI.customFixesList.innerHTML = "";
        state.customFixes.forEach((item) => {
          const chip = createChip(`${item.name} $${item.basePrice}`, "fix");
          const removeBtn = document.createElement("span");
          removeBtn.textContent = " ✕";
          removeBtn.className = "chip-remove";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.marginLeft = "4px";
          removeBtn.dataset.id = item.id;
          chip.appendChild(removeBtn);
          UI.customFixesList.appendChild(chip);
        });
      } else {
        UI.fixOtro.classList.add("hidden");
      }
    },
  },
  Equipment: {
    render(UI, state) {
      if (
        UI.heaterModelSelect &&
        UI.heaterModelSelect.value !== (state.heaterModel || "")
      ) {
        UI.heaterModelSelect.value = state.heaterModel || "";
      }
      if (
        UI.outdoorModelSelect &&
        UI.outdoorModelSelect.value !== (state.outdoorModel || "")
      ) {
        UI.outdoorModelSelect.value = state.outdoorModel || "";
      }
      if (
        UI.heaterModelSelect2 &&
        UI.heaterModelSelect2.value !== (state.heaterModel2 || "")
      ) {
        UI.heaterModelSelect2.value = state.heaterModel2 || "";
      }
      if (
        UI.outdoorModelSelect2 &&
        UI.outdoorModelSelect2.value !== (state.outdoorModel2 || "")
      ) {
        UI.outdoorModelSelect2.value = state.outdoorModel2 || "";
      }
    },
  },
  WeightIn: {
    render(UI, state) {
      Object.keys(UI.weightInInputs).forEach((key) => {
        const inputEl = UI.weightInInputs[key];
        if (inputEl && inputEl.value !== (state.weightInData[key] || "")) {
          inputEl.value = state.weightInData[key] || "";
        }
      });
      if (UI.weightInInputs2) {
        Object.keys(UI.weightInInputs2).forEach((key) => {
          const inputEl = UI.weightInInputs2[key];
          if (inputEl && inputEl.value !== (state.weightInData2?.[key] || "")) {
            inputEl.value = state.weightInData2?.[key] || "";
          }
        });
      }

      // Toggle visibility for System 2 container
      if (UI.weightInSystem2) {
        UI.weightInSystem2.classList.toggle("hidden", !state.isTwoSystems);

        if (state.isTwoSystems) {
          const heading =
            UI.weightInSystem2.querySelector("h3") ||
            UI.weightInSystem2.querySelector("h2");
          if (heading) {
            let chipContainer = heading.querySelector(".header-chips");
            if (!chipContainer) {
              chipContainer = document.createElement("span");
              chipContainer.className = "header-chips";
              chipContainer.style.display = "inline-flex";
              chipContainer.style.gap = "6px";
              chipContainer.style.marginLeft = "12px";
              chipContainer.style.verticalAlign = "middle";
              heading.appendChild(chipContainer);
            }

            chipContainer.innerHTML = "";

            if (state.heaterModel2) {
              const chip = createChip(state.heaterModel2, "default");
              chip.style.fontSize = "0.6em";
              chip.style.padding = "2px 6px";
              chip.style.height = "auto";
              chip.style.border = "1px solid #0072ce"; // Azul (Indoor)
              chip.style.color = "#0072ce";
              chip.style.backgroundColor = "var(--button-bg)";
              chip.title = "Indoor Unit (Sys 2)";
              chipContainer.appendChild(chip);
            }

            if (state.outdoorModel2) {
              const chip = createChip(state.outdoorModel2, "default");
              chip.style.fontSize = "0.6em";
              chip.style.padding = "2px 6px";
              chip.style.height = "auto";
              chip.style.border = "1px solid #008f6b"; // Verde (Outdoor)
              chip.style.color = "#008f6b";
              chip.style.backgroundColor = "var(--button-bg)";
              chip.title = "Outdoor Unit (Sys 2)";
              chipContainer.appendChild(chip);
            }
          }
        }
      }

      // Insertar chips de equipos en el encabezado H2 para contexto visual
      const section = document.getElementById("weight-in-data-section");
      if (section) {
        const h2 = section.querySelector("h2");
        if (h2) {
          let chipContainer = h2.querySelector(".header-chips");
          if (!chipContainer) {
            chipContainer = document.createElement("span");
            chipContainer.className = "header-chips";
            chipContainer.style.display = "inline-flex";
            chipContainer.style.gap = "6px";
            chipContainer.style.marginLeft = "12px";
            chipContainer.style.verticalAlign = "middle";
            h2.appendChild(chipContainer);
          }

          chipContainer.innerHTML = "";

          if (state.heaterModel) {
            const chip = createChip(state.heaterModel, "default");
            chip.style.fontSize = "0.6em";
            chip.style.padding = "2px 6px";
            chip.style.height = "auto";
            chip.style.border = "1px solid #0072ce"; // Azul (Indoor)
            chip.style.color = "#0072ce";
            chip.style.backgroundColor = "var(--button-bg)";
            chip.title = "Indoor Unit";
            chipContainer.appendChild(chip);
          }

          if (state.outdoorModel) {
            const chip = createChip(state.outdoorModel, "default");
            chip.style.fontSize = "0.6em";
            chip.style.padding = "2px 6px";
            chip.style.height = "auto";
            chip.style.border = "1px solid #008f6b"; // Verde (Outdoor)
            chip.style.color = "#008f6b";
            chip.style.backgroundColor = "var(--button-bg)";
            chip.title = "Outdoor Unit";
            chipContainer.appendChild(chip);
          }
        }
      }
    },
  },
  Notes: {
    render(UI, state) {
      if (UI.notesInput.value !== state.notes) {
        UI.notesInput.value = state.notes;
      }
    },
  },
};
