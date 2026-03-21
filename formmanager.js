import { SERVICES, OPTIONS, ACCESSORIES, FIXES } from "./constants.js";
import { revealSection, hideSection } from "./ui.js";
import { unidadesExteriores } from "./weightInData.js";
import { calculateCFM } from "./utils.js";
import {
  updateFactoryCharge,
  calculateSubcoolingAndDeviation,
} from "./weightInLogic.js";

export function initFormManager(context) {
  const {
    UI,
    getState,
    setState,
    saveToLocalStorage,
    saveToLocalStorageDebounced,
    hideLeakOptions,
    leaksButtons,
    getLeaksButton,
  } = context;

  // --- Address & Notes ---
  UI.addressInput.addEventListener("input", () => {
    setState({ address: UI.addressInput.value });
    saveToLocalStorageDebounced();
  });

  UI.notesInput.addEventListener("input", () => {
    setState({ notes: UI.notesInput.value });
    saveToLocalStorageDebounced();
  });

  // --- Service Type Buttons ---
  UI.serviceTypeButtons.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-service]");
    if (!btn || !UI.serviceTypeButtons.contains(btn)) return;

    const service = btn.dataset.service;
    const basePrice = parseFloat(btn.dataset.price) || 0;
    const state = getState();

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (service === SERVICES.CANCEL) {
      if (isActive) {
        UI.serviceTypeButtons
          .querySelectorAll("[data-service]")
          .forEach((el) => {
            if (el !== btn) el.classList.remove("active");
          });
        setState({
          selectedServices: [{ name: service, basePrice }],
          isTwoSystems: false,
          isTemporary: false,
        });
        UI.acHeatOptions
          .querySelectorAll(".btn")
          .forEach((el) => el.classList.remove("active"));

        [
          "thermostat-section",
          "accessory-section",
          "fixes-section",
          "weight-in-data-section",
        ].forEach(hideSection);
        revealSection("notes-section");
      } else {
        setState({
          selectedServices: state.selectedServices.filter(
            (s) => s.name !== service
          ),
        });
      }
    } else {
      if (isActive) {
        const cancelBtn = UI.serviceTypeButtons.querySelector(
          `[data-service="${SERVICES.CANCEL}"]`
        );
        if (cancelBtn) cancelBtn.classList.remove("active");
        const newServices = state.selectedServices.filter(
          (s) => ![SERVICES.CANCEL, service].includes(s.name)
        );
        newServices.push({ name: service, basePrice });
        setState({ selectedServices: newServices });
        revealSection("thermostat-section");
      } else {
        setState({
          selectedServices: state.selectedServices.filter(
            (s) => s.name !== service
          ),
        });
      }
    }

    // Update AC/Heat Options Visibility
    const newState = getState();
    const showAcHeatOptions = newState.selectedServices.some((s) =>
      [SERVICES.AC, SERVICES.HEAT, SERVICES.PRESTART, SERVICES.FINISH].includes(
        s.name
      )
    );
    UI.acHeatOptions.classList.toggle("hidden", !showAcHeatOptions);

    if (!showAcHeatOptions) {
      UI.acHeatOptions
        .querySelectorAll(".btn")
        .forEach((btn) => btn.classList.remove("active"));
      setState({
        isTwoSystems: false,
        isTemporary: false,
      });
    } else {
      const hasAcHeatOrPrestart = newState.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT, SERVICES.PRESTART].includes(s.name)
      );
      const hasAcOrHeat = newState.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT].includes(s.name)
      );
      if (!hasAcOrHeat) {
        const temporaryBtn = UI.acHeatOptions.querySelector(
          `[data-option="${OPTIONS.TEMPORARY}"]`
        );
        temporaryBtn.classList.remove("active");
        setState({ isTemporary: false });
      }
    }
    saveToLocalStorage();
  });

  // --- AC/Heat Options ---
  UI.acHeatOptions.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn")) return;
    const option = e.target.dataset.option;
    const state = getState();

    if (
      !state.selectedServices.some((s) =>
        [
          SERVICES.AC,
          SERVICES.HEAT,
          SERVICES.PRESTART,
          SERVICES.FINISH,
        ].includes(s.name)
      )
    ) {
      return;
    }

    if (option === OPTIONS.TEMPORARY) {
      const hasAcOrHeat = state.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT].includes(s.name)
      );
      if (!hasAcOrHeat) return;
    }

    e.target.classList.toggle("active");
    const isActive = e.target.classList.contains("active");

    if (option === OPTIONS.TEMPORARY) setState({ isTemporary: isActive });
    else if (option === OPTIONS.TWO_SYSTEMS)
      setState({ isTwoSystems: isActive });

    saveToLocalStorage();
  });

  // Helper to update quantity buttons visual state
  function updateQuantityButtons(qty) {
    if (!UI.quantitySelector) return;
    const btns = UI.quantitySelector.querySelectorAll(".qty-btn");
    btns.forEach((btn) => {
      const btnQty = parseInt(btn.dataset.qty);
      btn.classList.toggle("active", btnQty === qty);
    });
  }

  // --- Thermostats ---
  UI.thermostatButtons.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-thermostat]");
    if (!btn || !UI.thermostatButtons.contains(btn)) return;

    const thermostat = btn.dataset.thermostat;
    const wasActive = btn.classList.contains("active");

    UI.thermostatButtons
      .querySelectorAll(".btn")
      .forEach((el) => el.classList.remove("active"));

    if (wasActive) {
      setState({ selectedThermostat: null });
      UI.thermostatQuantity.classList.add("hidden");
    } else {
      btn.classList.add("active");
      setState({ selectedThermostat: { name: thermostat } });
      UI.thermostatQuantity.classList.remove("hidden");
      const state = getState();
      if (UI.quantitySelector) {
        updateQuantityButtons(state.thermostatQuantity || 1);
      }
      revealSection("accessory-section");
    }
    saveToLocalStorage();
  });

  if (UI.quantitySelector) {
    UI.quantitySelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".qty-btn");
      if (!btn) return;
      const quantity = parseInt(btn.dataset.qty);
      updateQuantityButtons(quantity);
      setState({ thermostatQuantity: quantity });
      saveToLocalStorageDebounced();
    });
  }

  // --- Accessories ---
  UI.accessoryButtons.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn")) return;

    const accessory = e.target.dataset.accessory;
    const basePrice = parseFloat(e.target.dataset.price) || 0;
    const toggleTarget = e.target.dataset.toggleTarget;
    const state = getState();

    e.target.classList.toggle("active");
    const isActive = e.target.classList.contains("active");

    const toggleSubgroup = (selector, show) => {
      if (!selector) return;
      const group = document.querySelector(selector);
      if (!group) return;
      group.classList.toggle("hidden", !show);
      if (!show) {
        group.querySelectorAll(".btn.active").forEach((btn) => {
          btn.classList.remove("active");
          const name = btn.dataset.accessory;
          const currentAcc = getState().selectedAccessories;
          setState({
            selectedAccessories: currentAcc.filter((a) => a.name !== name),
          });
        });
      }
    };

    if (accessory === ACCESSORIES.OTRO) {
      if (isActive) {
        UI.accessoryOtro.classList.remove("hidden");
        setState({ isOtroAccessoryOpen: true });
        UI.otroNameInput.focus();
      } else {
        UI.accessoryOtro.classList.add("hidden");
        setState({ isOtroAccessoryOpen: false });
      }
      toggleSubgroup(toggleTarget, isActive);
    } else {
      if (isActive) {
        toggleSubgroup(toggleTarget, true);
        const newAcc = [
          ...state.selectedAccessories,
          { name: accessory, basePrice },
        ];
        setState({ selectedAccessories: newAcc });
        revealSection("fixes-section");
      } else {
        toggleSubgroup(toggleTarget, false);
        setState({
          selectedAccessories: state.selectedAccessories.filter(
            (a) => a.name !== accessory
          ),
        });
      }
    }
    saveToLocalStorage();
  });

  // --- "Otro" Handlers ---
  function setupCustomItemHandler(
    nameInput,
    priceInput,
    addButton,
    listContainer,
    stateKey,
    maxPrice = 1000
  ) {
    const addItem = () => {
      const name = nameInput.value.trim();
      let price = parseFloat(priceInput.value) || 0;

      if (!name) return;

      if (price < 0) {
        priceInput.value = 0;
        price = 0;
      }
      if (price > maxPrice) {
        priceInput.value = maxPrice;
        price = maxPrice;
        alert(`El precio máximo permitido es $${maxPrice}`);
      }

      const currentState = getState();
      const currentList = currentState[stateKey] || [];
      const newItem = { id: Date.now(), name, basePrice: price };

      setState({ [stateKey]: [...currentList, newItem] });
      saveToLocalStorageDebounced();

      // Clear inputs and refocus
      nameInput.value = "";
      priceInput.value = "";
      nameInput.focus();
    };

    addButton.addEventListener("click", addItem);
    priceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem();
      }
    });

    // Remove item handler (delegated)
    listContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-remove")) {
        const id = Number(e.target.dataset.id);
        const currentList = getState()[stateKey];
        setState({ [stateKey]: currentList.filter((item) => item.id !== id) });
        saveToLocalStorageDebounced();
      }
    });
  }

  setupCustomItemHandler(
    UI.otroNameInput,
    UI.otroPriceInput,
    UI.btnAddOtroAccessory,
    UI.customAccessoriesList,
    "customAccessories",
    500
  );
  setupCustomItemHandler(
    UI.fixOtroNameInput,
    UI.fixOtroPriceInput,
    UI.btnAddOtroFix,
    UI.customFixesList,
    "customFixes",
    300
  );

  // --- Common Fixes ---
  UI.fixesSection.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || !UI.fixesSection.contains(btn)) return;

    const state = getState();
    const leakOption = btn.dataset.leakOption;
    if (leakOption) {
      // Toggle logic
      if (state.leakDetail === leakOption) {
        setState({ leakDetail: null });
        leaksButtons().forEach((opt) => opt.classList.remove("active"));

        // Restore main view
        UI.leaksOptions.classList.add("hidden");
        const leaksBtn = getLeaksButton();
        if (leaksBtn) leaksBtn.classList.remove("hidden");
      } else {
        const leaksBtn = getLeaksButton();
        const leaksInState = state.selectedFixes.some(
          (f) => f.name === FIXES.LEAKS
        );
        if (!leaksInState && leaksBtn) {
          leaksBtn.classList.add("active");
          const newFixes = [
            ...state.selectedFixes,
            {
              name: FIXES.LEAKS,
              basePrice: parseFloat(leaksBtn.dataset.price) || 0,
            },
          ];
          setState({ selectedFixes: newFixes });
        }
        UI.leaksOptions.classList.remove("hidden");
        leaksButtons().forEach((opt) =>
          opt.classList.toggle("active", opt.dataset.leakOption === leakOption)
        );
        setState({ leakDetail: leakOption });
      }
      saveToLocalStorage();
      return;
    }

    const fix = btn.dataset.fix;
    if (!fix) return;
    const basePrice = parseFloat(btn.dataset.price) || 0;

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (fix === FIXES.LEAKS) {
      if (isActive) {
        const already = state.selectedFixes.some((f) => f.name === FIXES.LEAKS);
        if (!already) {
          setState({
            selectedFixes: [...state.selectedFixes, { name: fix, basePrice }],
          });
        }
        UI.leaksOptions.classList.remove("hidden");
        btn.classList.add("hidden");
        revealSection("weight-in-data-section");
        revealSection("notes-section");
      } else {
        setState({
          selectedFixes: state.selectedFixes.filter(
            (f) => f.name !== FIXES.LEAKS
          ),
        });
        hideLeakOptions();
      }
      saveToLocalStorage();
      return;
    }

    if (fix === FIXES.OTRO) {
      if (isActive) {
        UI.fixOtro.classList.remove("hidden");
        setState({ isOtroFixOpen: true });
        UI.fixOtroNameInput.focus();
      } else {
        UI.fixOtro.classList.add("hidden");
        setState({ isOtroFixOpen: false });
      }
    } else {
      if (isActive) {
        setState({
          selectedFixes: [...state.selectedFixes, { name: fix, basePrice }],
        });
        revealSection("weight-in-data-section");
        revealSection("notes-section");
      } else {
        setState({
          selectedFixes: state.selectedFixes.filter((f) => f.name !== fix),
        });
      }
    }
    saveToLocalStorage();
  });

  // --- Equipment Selects ---
  if (UI.heaterModelSelect) {
    UI.heaterModelSelect.addEventListener("change", () => {
      setState({ heaterModel: UI.heaterModelSelect.value });
    });
  }

  if (UI.outdoorModelSelect) {
    UI.outdoorModelSelect.addEventListener("change", () => {
      const model = UI.outdoorModelSelect.value;
      setState({ outdoorModel: model });

      const data = unidadesExteriores[model];
      if (data) {
        updateFactoryCharge();
        if (data.btu && UI.weightInInputs.fanSpeedCfm) {
          const { min } = calculateCFM(data.btu);
          UI.weightInInputs.fanSpeedCfm.value = min;
          const state = getState();
          state.weightInData.fanSpeedCfm = String(min);
          setState({ weightInData: state.weightInData });
        }
        if (data.subcooling && UI.weightInInputs.oemSubcoolingGoal) {
          UI.weightInInputs.oemSubcoolingGoal.value = data.subcooling;
          const state = getState();
          state.weightInData.oemSubcoolingGoal = String(data.subcooling);
          setState({ weightInData: state.weightInData });
          calculateSubcoolingAndDeviation();
        }
        saveToLocalStorageDebounced();
      }
    });
  }

  if (UI.heaterModelSelect2) {
    UI.heaterModelSelect2.addEventListener("change", () => {
      setState({ heaterModel2: UI.heaterModelSelect2.value });
    });
  }

  if (UI.outdoorModelSelect2) {
    UI.outdoorModelSelect2.addEventListener("change", () => {
      setState({ outdoorModel2: UI.outdoorModelSelect2.value });

      const model = UI.outdoorModelSelect2.value;
      const data = unidadesExteriores[model];
      if (data) {
        updateFactoryCharge(2);
        // Opcional: Actualizar CFM para sistema 2 si existiera el input
        if (
          data.subcooling &&
          UI.weightInInputs2 &&
          UI.weightInInputs2.oemSubcoolingGoal
        ) {
          UI.weightInInputs2.oemSubcoolingGoal.value = data.subcooling;
          calculateSubcoolingAndDeviation(2);
        }
        saveToLocalStorageDebounced();
      }
    });
  }
}
