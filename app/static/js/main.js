/**
 * CRUST & FLAME - ENTERPRISE PIZZERIA JAVASCRIPT
 * Complete interactive suite: Pizza Customizer Modal, Real-time Pricing,
 * Cart Management, Live Search, Mobile Drawer, Coupons, and Order Tracking.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // 1. CART STATE & INITIALIZATION
  // ==========================================================================
  try {
    window.cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!Array.isArray(window.cart)) window.cart = [];
  } catch (e) {
    console.warn("Could not read cart from localStorage, initializing fresh:", e);
    window.cart = [];
  }

  window.appliedCoupon = null;

  // ==========================================================================
  // 2. TOAST NOTIFICATION SYSTEM
  // ==========================================================================
  window.showToast = function (message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type === "success" ? "toast-success" : ""}`;

    const icon = type === "success" ? "🍕" : "✨";
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeToast = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      setTimeout(() => toast.remove(), 260);
    };

    toast.querySelector(".toast-close").addEventListener("click", closeToast);
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) closeToast();
    }, 3800);
  };

  // ==========================================================================
  // 3. CART COUNTER & BOUNCE ANIMATION
  // ==========================================================================
  window.updateCartCount = function () {
    const totalQty = (window.cart || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    // Update Header Badge
    const headerBadge = document.getElementById("cart-count");
    if (headerBadge) {
      headerBadge.textContent = totalQty;
      headerBadge.classList.remove("bounce");
      void headerBadge.offsetWidth; // Force reflow
      headerBadge.classList.add("bounce");
    }

    // Update Mobile Drawer Badge
    const mobileBadge = document.getElementById("mobile-cart-count");
    if (mobileBadge) mobileBadge.textContent = totalQty;

    // Update Hero Button Counter
    document.querySelectorAll(".hero-cart-counter").forEach((el) => {
      el.textContent = totalQty;
    });
  };

  // ==========================================================================
  // 4. PIZZA CUSTOMIZER MODAL ENGINE (HERO FEATURE: WHOLE & HALF-AND-HALF)
  // ==========================================================================
  window.activeModalPizza = null;
  window.modalItemQty = 1;
  window.pizzaSplitMode = "whole"; // 'whole' or 'half_half'

  window.setPizzaSplitMode = function (mode) {
    window.pizzaSplitMode = mode;
    const wholeBtn = document.getElementById("modal-mode-whole-btn");
    const halfBtn = document.getElementById("modal-mode-half-btn");
    const splitLine = document.getElementById("pizza-split-line");
    const splitLabels = document.getElementById("pizza-split-labels");

    if (mode === "half_half") {
      if (wholeBtn) wholeBtn.classList.remove("active");
      if (halfBtn) halfBtn.classList.add("active");
      if (splitLine) splitLine.style.display = "block";
      if (splitLabels) splitLabels.style.display = "flex";

      // Show split controls on all checked toppings
      document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
        const ctrl = document.getElementById(`split-ctrl-${cb.value}`);
        if (ctrl) ctrl.style.display = "flex";
      });
    } else {
      if (halfBtn) halfBtn.classList.remove("active");
      if (wholeBtn) wholeBtn.classList.add("active");
      if (splitLine) splitLine.style.display = "none";
      if (splitLabels) splitLabels.style.display = "none";

      // Hide split controls
      document.querySelectorAll(".topping-split-control").forEach((ctrl) => {
        ctrl.style.display = "none";
      });
    }

    recalculateModalPrice();
  };

  window.setToppingSplit = function (toppingId, pos, btn) {
    const cb = document.getElementById(`topping-check-${toppingId}`);
    if (cb) {
      cb.setAttribute("data-half", pos);
      // Ensure checkbox is checked if user clicks split
      if (!cb.checked) {
        cb.checked = true;
      }
    }

    // Update active pill button
    const ctrl = document.getElementById(`split-ctrl-${toppingId}`);
    if (ctrl) {
      ctrl.querySelectorAll(".split-pill-btn").forEach((b) => b.classList.remove("active"));
      if (btn) btn.classList.add("active");
    }

    // Update topping price label
    const priceTag = document.getElementById(`topping-price-tag-${toppingId}`);
    if (cb && priceTag) {
      const basePrice = Number(cb.getAttribute("data-price") || 0.0);
      const isHalf = pos === "left" || pos === "right";
      const displayPrice = isHalf ? basePrice * 0.5 : basePrice;
      priceTag.textContent = `+$${displayPrice.toFixed(2)}${isHalf ? " (½)" : ""}`;
    }

    recalculateModalPrice();
  };

  window.onToppingCheckChange = function (toppingId) {
    const cb = document.getElementById(`topping-check-${toppingId}`);
    const ctrl = document.getElementById(`split-ctrl-${toppingId}`);
    if (cb && ctrl) {
      if (cb.checked && window.pizzaSplitMode === "half_half") {
        ctrl.style.display = "flex";
      } else {
        ctrl.style.display = "none";
        cb.setAttribute("data-half", "whole");
        const wholeBtn = document.getElementById(`split-btn-whole-${toppingId}`);
        if (wholeBtn) {
          ctrl.querySelectorAll(".split-pill-btn").forEach((b) => b.classList.remove("active"));
          wholeBtn.classList.add("active");
        }
      }
    }
    recalculateModalPrice();
  };

  window.openCustomizationModal = function (id, name, basePrice, imageUrl, desc) {
    window.activeModalPizza = {
      id: Number(id),
      name: name || "Custom Pizza",
      basePrice: Number(basePrice) || 0.0,
      imageUrl: imageUrl || "",
      desc: desc || ""
    };
    window.modalItemQty = 1;

    const modal = document.getElementById("custom-modal");
    const backdrop = document.getElementById("custom-modal-backdrop");
    const titleEl = document.getElementById("modal-pizza-name");
    const descEl = document.getElementById("modal-pizza-desc");
    const qtyVal = document.getElementById("modal-qty-val");
    const instructionsInput = document.getElementById("modal-special-instructions");

    if (titleEl) titleEl.textContent = `Customize: ${name}`;
    if (descEl && desc) descEl.textContent = desc;
    if (qtyVal) qtyVal.textContent = "1";
    if (instructionsInput) instructionsInput.value = "";

    // Reset split mode to Whole
    setPizzaSplitMode("whole");

    // Reset size to Regular
    const regularRadio = document.querySelector('input[name="modal_size"][value="Regular"]');
    if (regularRadio) regularRadio.checked = true;

    // Reset crust to first option
    const firstCrust = document.querySelector('input[name="modal_crust"]');
    if (firstCrust) firstCrust.checked = true;

    // Reset sauce & cheese to first options
    const sauceSelect = document.getElementById("modal-sauce-select");
    if (sauceSelect) sauceSelect.selectedIndex = 0;
    const cheeseSelect = document.getElementById("modal-cheese-select");
    if (cheeseSelect) cheeseSelect.selectedIndex = 0;

    // Uncheck extra toppings & reset split data
    document.querySelectorAll(".modal-topping-checkbox").forEach((cb) => {
      cb.checked = false;
      cb.setAttribute("data-half", "whole");
    });
    document.querySelectorAll(".topping-split-control").forEach((ctrl) => {
      ctrl.style.display = "none";
    });

    recalculateModalPrice();

    if (modal) modal.style.display = "flex";
    if (backdrop) backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  window.closeCustomizationModal = function () {
    const modal = document.getElementById("custom-modal");
    const backdrop = document.getElementById("custom-modal-backdrop");
    if (modal) modal.style.display = "none";
    if (backdrop) backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
    window.activeModalPizza = null;
  };

  window.adjustModalQty = function (delta) {
    window.modalItemQty = Math.max(1, Math.min(20, window.modalItemQty + delta));
    const qtyVal = document.getElementById("modal-qty-val");
    if (qtyVal) qtyVal.textContent = window.modalItemQty;
    recalculateModalPrice();
  };

  window.recalculateModalPrice = function () {
    if (!window.activeModalPizza) return 0.0;

    const base = Number(window.activeModalPizza.basePrice);

    // 1. Size multiplier
    const selectedSizeRadio = document.querySelector('input[name="modal_size"]:checked');
    const sizeMultiplier = selectedSizeRadio
      ? Number(selectedSizeRadio.getAttribute("data-mult") || 1.0)
      : 1.0;
    const sizeName = selectedSizeRadio ? selectedSizeRadio.value : "Regular";

    let unitPrice = base * sizeMultiplier;

    // 2. Crust modifier
    const selectedCrust = document.querySelector('input[name="modal_crust"]:checked');
    let crustName = "Neapolitan Classic";
    if (selectedCrust) {
      unitPrice += Number(selectedCrust.getAttribute("data-price") || 0.0);
      crustName = selectedCrust.getAttribute("data-name") || crustName;
    }

    // 3. Sauce & Cheese modifiers
    const sauceSelect = document.getElementById("modal-sauce-select");
    let sauceName = "San Marzano Tomato";
    if (sauceSelect) {
      const opt = sauceSelect.options[sauceSelect.selectedIndex];
      if (opt) {
        sauceName = opt.value;
        unitPrice += Number(opt.getAttribute("data-price") || 0.0);
      }
    }

    const cheeseSelect = document.getElementById("modal-cheese-select");
    let cheeseName = "Fior di Latte";
    if (cheeseSelect) {
      const opt = cheeseSelect.options[cheeseSelect.selectedIndex];
      if (opt) {
        cheeseName = opt.value;
        unitPrice += Number(opt.getAttribute("data-price") || 0.0);
      }
    }

    // 4. Extra toppings (50% price if left/right half in split mode)
    let toppingsCount = 0;
    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      const topPrice = Number(cb.getAttribute("data-price") || 0.0);
      const half = cb.getAttribute("data-half") || "whole";
      if (window.pizzaSplitMode === "half_half" && (half === "left" || half === "right")) {
        unitPrice += Math.round((topPrice * 0.5) * 100) / 100;
      } else {
        unitPrice += topPrice;
      }
      toppingsCount++;
    });

    const qty = window.modalItemQty || 1;
    const totalPrice = unitPrice * qty;

    // Update Display Elements
    const priceDisplay = document.getElementById("modal-calculated-price");
    if (priceDisplay) {
      priceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
    }

    const ctaText = document.getElementById("modal-cta-text");
    if (ctaText) {
      ctaText.textContent = `Add to Cart • $${totalPrice.toFixed(2)}`;
    }

    const summaryPill = document.getElementById("modal-summary-pill");
    if (summaryPill) {
      const splitLabel = window.pizzaSplitMode === "half_half" ? "◐ Half & Half" : "● Whole";
      let topText = toppingsCount > 0 ? ` • +${toppingsCount} Topping${toppingsCount > 1 ? "s" : ""}` : "";
      summaryPill.textContent = `${sizeName} • ${splitLabel} • ${crustName}${topText}`;
    }

    // 5. Update Interactive Visual Pizza Builder Layers
    const visualDisk = document.getElementById("pizza-visual-disk");
    const visualCrust = document.getElementById("visual-crust-layer");
    const visualBadge = document.getElementById("visual-pizza-badge");

    if (visualDisk) {
      visualDisk.classList.remove("scale-small", "scale-regular", "scale-large");
      if (sizeName === "Small") visualDisk.classList.add("scale-small");
      else if (sizeName === "Large") visualDisk.classList.add("scale-large");
      else visualDisk.classList.add("scale-regular");
    }

    if (visualCrust) {
      if (crustName.toLowerCase().includes("stuffed") || crustName.toLowerCase().includes("cheese")) {
        visualCrust.classList.add("crust-stuffed");
      } else {
        visualCrust.classList.remove("crust-stuffed");
      }
    }

    // Dynamic Topping Graphic Groups with Half & Half clipping
    const checkedToppingElements = Array.from(document.querySelectorAll(".modal-topping-checkbox:checked"));
    const checkedToppingNames = checkedToppingElements.map(cb => (cb.getAttribute("data-name") || "").toLowerCase());

    const toggleGroup = (id, condition, half) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = condition ? "block" : "none";
        if (condition && window.pizzaSplitMode === "half_half") {
          if (half === "left") {
            el.style.clipPath = "polygon(0 0, 50% 0, 50% 100%, 0 100%)";
          } else if (half === "right") {
            el.style.clipPath = "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)";
          } else {
            el.style.clipPath = "none";
          }
        } else if (el) {
          el.style.clipPath = "none";
        }
      }
    };

    const getToppingHalf = (pattern) => {
      const match = checkedToppingElements.find(cb => (cb.getAttribute("data-name") || "").toLowerCase().includes(pattern));
      return match ? (match.getAttribute("data-half") || "whole") : "whole";
    };

    toggleGroup("topping-viz-pepperoni", checkedToppingNames.some(n => n.includes("pepperoni") || n.includes("sausage") || n.includes("meat")), getToppingHalf("pepperoni"));
    toggleGroup("topping-viz-basil", checkedToppingNames.some(n => n.includes("basil") || n.includes("spinach") || n.includes("herb")), getToppingHalf("basil"));
    toggleGroup("topping-viz-mushrooms", checkedToppingNames.some(n => n.includes("mushroom")), getToppingHalf("mushroom"));
    toggleGroup("topping-viz-chilies", checkedToppingNames.some(n => n.includes("chili") || n.includes("spicy") || n.includes("jalapeno")), getToppingHalf("chili"));
    toggleGroup("topping-viz-olives", checkedToppingNames.some(n => n.includes("olive")), getToppingHalf("olive"));
    toggleGroup("topping-viz-cheese", checkedToppingNames.some(n => n.includes("mozzarella") || n.includes("parmesan") || n.includes("cheese")) || cheeseName.includes("Extra"), "whole");
    toggleGroup("topping-viz-truffle", checkedToppingNames.some(n => n.includes("truffle") || n.includes("oil")), "whole");

    if (visualBadge) {
      const splitIndicator = window.pizzaSplitMode === "half_half" ? "◐ Half &amp; Half" : "● Whole";
      visualBadge.innerHTML = `🍕 ${sizeName} &middot; ${splitIndicator} &middot; ${crustName}${toppingsCount > 0 ? ` &middot; +${toppingsCount} Topping${toppingsCount > 1 ? 's' : ''}` : ''}`;
    }

    return { unitPrice, totalPrice };
  };

  window.addCustomizedPizzaToCart = function () {
    if (!window.activeModalPizza) return;

    const { unitPrice } = recalculateModalPrice();

    const sizeRadio = document.querySelector('input[name="modal_size"]:checked');
    const size = sizeRadio ? sizeRadio.value : "Regular";

    const crustRadio = document.querySelector('input[name="modal_crust"]:checked');
    const crust_id = crustRadio ? Number(crustRadio.value) : null;
    const crust_name = crustRadio ? crustRadio.getAttribute("data-name") : null;

    const sauceSelect = document.getElementById("modal-sauce-select");
    const sauce = sauceSelect ? sauceSelect.value : "San Marzano Tomato";

    const cheeseSelect = document.getElementById("modal-cheese-select");
    const cheese_style = cheeseSelect ? cheeseSelect.value : "Fior di Latte";

    const toppings = [];
    const half_left = [];
    const half_right = [];

    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      const tid = Number(cb.value);
      const tname = cb.getAttribute("data-name");
      const tprice = Number(cb.getAttribute("data-price") || 0.0);
      const half = cb.getAttribute("data-half") || "whole";

      toppings.push({
        topping_id: tid,
        topping_name: tname,
        price: tprice,
        half: half
      });

      if (half === "left") half_left.push(tname);
      else if (half === "right") half_right.push(tname);
      else {
        half_left.push(tname);
        half_right.push(tname);
      }
    });

    const instructionsInput = document.getElementById("modal-special-instructions");
    const special_instructions = instructionsInput ? instructionsInput.value.trim() : "";

    const quantity = window.modalItemQty || 1;

    window.cart.push({
      pizza_id: window.activeModalPizza.id,
      name: window.activeModalPizza.name,
      price: Math.round(unitPrice * 100) / 100,
      quantity: quantity,
      size: size,
      crust_id: crust_id,
      crust_name: crust_name,
      split_mode: window.pizzaSplitMode || "whole",
      sauce: sauce,
      cheese_style: cheese_style,
      half_left: half_left,
      half_right: half_right,
      toppings: toppings,
      special_instructions: special_instructions,
      is_customized: true
    });

    localStorage.setItem("cart", JSON.stringify(window.cart));
    updateCartCount();
    closeCustomizationModal();

    showToast(
      `Added custom <strong>${window.activeModalPizza.name}</strong> (${size}) to cart!`,
      "success"
    );
  };

  // ==========================================================================
  // 5. DIRECT ADD TO CART (FOR SIDES & DRINKS)
  // ==========================================================================
  window.addToCart = function (item_id, name, price) {
    item_id = Number(item_id);
    price = Number(price);

    let existingItem = window.cart.find(
      (i) => Number(i.pizza_id) === item_id && !i.is_customized
    );

    if (existingItem) {
      existingItem.quantity = Number(existingItem.quantity) + 1;
    } else {
      window.cart.push({
        pizza_id: item_id,
        name: name,
        price: price,
        quantity: 1,
        size: "Regular",
        toppings: [],
        is_customized: false
      });
    }

    localStorage.setItem("cart", JSON.stringify(window.cart));
    updateCartCount();
    showToast(`Added <strong>${name}</strong> to your cart!`, "success");
  };

  // ==========================================================================
  // 6. CART MANAGEMENT & CHECKOUT LOGIC
  // ==========================================================================
  window.changeQuantity = function (index, delta) {
    if (!window.cart[index]) return;

    window.cart[index].quantity = Number(window.cart[index].quantity) + delta;
    if (window.cart[index].quantity <= 0) {
      removeFromCart(index);
      return;
    }

    localStorage.setItem("cart", JSON.stringify(window.cart));
    renderCart();
    updateCartCount();
  };

  window.removeFromCart = function (index) {
    const itemToRemove = window.cart[index];
    window.cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(window.cart));
    renderCart();
    updateCartCount();
    if (itemToRemove) {
      showToast(`Removed <strong>${itemToRemove.name}</strong> from cart.`, "info");
    }
  };

  // Fulfillment Mode (Delivery vs. Store Pickup)
  window.currentFulfillment = "delivery";
  window.selectedTipType = 0;
  window.customTipAmount = 0.0;
  window.isRedeemingPoints = false;

  window.setFulfillmentMode = function (mode) {
    window.currentFulfillment = mode;
    const hiddenType = document.getElementById("hidden-order-type");
    if (hiddenType) hiddenType.value = mode;

    const delBtn = document.getElementById("seg-delivery-btn");
    const pickBtn = document.getElementById("seg-pickup-btn");
    const pickupCard = document.getElementById("pickup-info-card");
    const addrGroup = document.getElementById("delivery-address-group");
    const addrInput = document.getElementById("address");
    const tipSection = document.getElementById("tip-section");
    const submitText = document.getElementById("submit-order-text");

    if (mode === "pickup") {
      if (delBtn) delBtn.classList.remove("active");
      if (pickBtn) pickBtn.classList.add("active");
      if (pickupCard) pickupCard.style.display = "block";
      if (addrGroup) addrGroup.style.display = "none";
      if (addrInput) addrInput.required = false;
      if (tipSection) tipSection.style.display = "none";
      if (submitText) submitText.textContent = "Place Store Pickup Order";
    } else {
      if (pickBtn) pickBtn.classList.remove("active");
      if (delBtn) delBtn.classList.add("active");
      if (pickupCard) pickupCard.style.display = "none";
      if (addrGroup) addrGroup.style.display = "block";
      if (addrInput) addrInput.required = true;
      if (tipSection) tipSection.style.display = "block";
      if (submitText) submitText.textContent = "Place Delivery Order Now";
    }

    renderCart();
  };

  // Delivery & Pickup Timing Mode (ASAP vs Schedule for Later)
  window.currentTimingMode = "asap";
  window.setTimingMode = function (mode) {
    window.currentTimingMode = mode;
    const asapBtn = document.getElementById("time-asap-btn");
    const schedBtn = document.getElementById("time-schedule-btn");
    const pickerWrap = document.getElementById("schedule-picker-wrap");
    const hiddenScheduled = document.getElementById("hidden-scheduled-time");
    const schedSelect = document.getElementById("scheduled-time-select");

    if (mode === "schedule") {
      if (asapBtn) asapBtn.classList.remove("active");
      if (schedBtn) schedBtn.classList.add("active");
      if (pickerWrap) pickerWrap.style.display = "block";
      if (hiddenScheduled && schedSelect) {
        hiddenScheduled.value = schedSelect.value;
      }
    } else {
      if (schedBtn) schedBtn.classList.remove("active");
      if (asapBtn) asapBtn.classList.add("active");
      if (pickerWrap) pickerWrap.style.display = "none";
      if (hiddenScheduled) hiddenScheduled.value = "ASAP";
    }
  };

  window.updateScheduledTimeValue = function () {
    const hiddenScheduled = document.getElementById("hidden-scheduled-time");
    const schedSelect = document.getElementById("scheduled-time-select");
    if (hiddenScheduled && schedSelect) {
      hiddenScheduled.value = schedSelect.value;
    }
  };

  // Driver Tip Selection
  window.selectTip = function (val, btn) {
    window.selectedTipType = Number(val);
    document.querySelectorAll(".tip-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const customWrap = document.getElementById("custom-tip-wrap");
    if (customWrap) customWrap.style.display = "none";

    renderCart();
  };

  window.selectCustomTip = function (btn) {
    window.selectedTipType = "custom";
    document.querySelectorAll(".tip-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const customWrap = document.getElementById("custom-tip-wrap");
    if (customWrap) {
      customWrap.style.display = "block";
      const input = document.getElementById("custom-tip-input");
      if (input) input.focus();
    }

    renderCart();
  };

  window.updateCustomTip = function (val) {
    window.customTipAmount = Math.max(0.0, parseFloat(val) || 0.0);
    renderCart();
  };

  // Loyalty Points Redemption
  window.toggleRedeemPoints = function (checked) {
    window.isRedeemingPoints = Boolean(checked);
    const hiddenPoints = document.getElementById("hidden-redeem-points");
    if (hiddenPoints) hiddenPoints.value = window.isRedeemingPoints ? "true" : "false";
    renderCart();
  };

  window.renderCart = function () {
    const tbody = document.getElementById("cart-items");
    const emptyState = document.getElementById("cart-empty-state");
    const mainLayout = document.getElementById("cart-main-layout");
    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    const taxEl = document.getElementById("tax-amount");
    const deliveryDisplay = document.getElementById("delivery-fee-display");
    const deliveryLabel = document.getElementById("delivery-label");
    const discountRow = document.getElementById("discount-row");
    const discountCodeBadge = document.getElementById("discount-code-badge");
    const discountAmountEl = document.getElementById("discount-amount");
    const pointsRow = document.getElementById("points-discount-row");
    const tipRow = document.getElementById("tip-row");
    const tipAmountDisplay = document.getElementById("tip-amount-display");
    const hiddenTipInput = document.getElementById("hidden-tip-amount");
    const pointsEarnedDisplay = document.getElementById("points-earned-display");

    if (!tbody) return;

    if (!window.cart || window.cart.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      if (mainLayout) mainLayout.style.display = "none";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (mainLayout) mainLayout.style.display = "grid";

    tbody.innerHTML = "";
    let subtotal = 0;

    window.cart.forEach((item, index) => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;

      let customTags = "";
      if (item.size && item.size !== "Regular") {
        customTags += `<span class="cart-custom-tag">${item.size} (Size)</span>`;
      }
      if (item.crust_name) {
        customTags += `<span class="cart-custom-tag">${item.crust_name}</span>`;
      }
      if (item.split_mode === "half_half") {
        customTags += `<span class="cart-custom-tag" style="background: rgba(132, 94, 247, 0.2); color: #B197FC; font-weight: 700;">◐ Half &amp; Half</span>`;
        if (item.half_left && item.half_left.length > 0) {
          customTags += `<div style="font-size: 0.78rem; color: #1971C2; margin-top: 2px;">◀ Left Half: ${item.half_left.join(", ")}</div>`;
        }
        if (item.half_right && item.half_right.length > 0) {
          customTags += `<div style="font-size: 0.78rem; color: #D9480F; margin-top: 2px;">▶ Right Half: ${item.half_right.join(", ")}</div>`;
        }
      } else if (item.toppings && item.toppings.length > 0) {
        const topNames = item.toppings.map((t) => t.topping_name).join(", ");
        customTags += `<div style="margin-top: 4px;"><span class="cart-custom-tag">+ ${topNames}</span></div>`;
      }
      if (item.sauce && item.sauce !== "San Marzano Tomato") {
        customTags += `<span class="cart-custom-tag">Sauce: ${item.sauce}</span>`;
      }
      if (item.cheese_style && item.cheese_style !== "Fior di Latte") {
        customTags += `<span class="cart-custom-tag">Cheese: ${item.cheese_style}</span>`;
      }
      if (item.special_instructions) {
        customTags += `<div style="font-size: 0.76rem; color: var(--text-light); font-style: italic; margin-top: 2px;">Note: "${item.special_instructions}"</div>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="cart-item-title">${item.name}</div>
          ${customTags}
        </td>
        <td>
          <div class="cart-qty-control">
            <button type="button" class="cart-qty-btn" onclick="changeQuantity(${index}, -1)" title="Decrease quantity">&minus;</button>
            <span class="cart-qty-val">${item.quantity}</span>
            <button type="button" class="cart-qty-btn" onclick="changeQuantity(${index}, 1)" title="Increase quantity">&plus;</button>
          </div>
        </td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td><strong>$${lineTotal.toFixed(2)}</strong></td>
        <td style="text-align: right;">
          <button type="button" class="cart-remove-btn" onclick="removeFromCart(${index})" title="Remove item from cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

    // 1. Coupon Discount Calculation
    let couponDiscount = 0;
    if (window.appliedCoupon) {
      if (window.appliedCoupon.discount_type === "percent") {
        couponDiscount = (window.appliedCoupon.discount_value / 100.0) * subtotal;
      } else {
        couponDiscount = Math.min(window.appliedCoupon.discount_value, subtotal);
      }
      couponDiscount = Math.round(couponDiscount * 100) / 100;

      if (discountRow) discountRow.style.display = "flex";
      if (discountCodeBadge) discountCodeBadge.textContent = window.appliedCoupon.code;
      if (discountAmountEl) discountAmountEl.textContent = couponDiscount.toFixed(2);
    } else {
      if (discountRow) discountRow.style.display = "none";
    }

    // 2. Loyalty Points Discount ($5.00 off)
    let pointsDiscount = 0;
    if (window.isRedeemingPoints) {
      pointsDiscount = Math.min(5.0, subtotal);
      if (pointsRow) pointsRow.style.display = "flex";
    } else {
      if (pointsRow) pointsRow.style.display = "none";
    }

    const totalDiscount = couponDiscount + pointsDiscount;
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = Math.round(taxableAmount * 0.08 * 100) / 100;
    if (taxEl) taxEl.textContent = tax.toFixed(2);

    // 3. Delivery Fee (Waived if Store Pickup or Subtotal >= $50)
    let deliveryFee = 0.0;
    if (window.currentFulfillment === "pickup") {
      deliveryFee = 0.0;
      if (deliveryLabel) deliveryLabel.textContent = "Store Pickup (15-20 min)";
      if (deliveryDisplay) {
        deliveryDisplay.textContent = "FREE ($0.00)";
        deliveryDisplay.style.color = "var(--secondary)";
      }
    } else {
      deliveryFee = subtotal >= 50.0 ? 0.0 : 3.5;
      if (deliveryLabel) deliveryLabel.textContent = "Express Delivery";
      if (deliveryDisplay) {
        deliveryDisplay.textContent = deliveryFee === 0.0 ? "FREE" : "$3.50";
        deliveryDisplay.style.color = deliveryFee === 0.0 ? "var(--secondary)" : "inherit";
      }
    }

    // 4. Driver Tip Calculation
    let tip = 0.0;
    if (window.currentFulfillment === "delivery") {
      if (window.selectedTipType === "custom") {
        tip = window.customTipAmount || 0.0;
      } else if (typeof window.selectedTipType === "number" && window.selectedTipType > 0) {
        tip = Math.round(((window.selectedTipType / 100.0) * subtotal) * 100) / 100;
      }

      if (tip > 0) {
        if (tipRow) tipRow.style.display = "flex";
        if (tipAmountDisplay) tipAmountDisplay.textContent = tip.toFixed(2);
      } else {
        if (tipRow) tipRow.style.display = "none";
      }
    } else {
      if (tipRow) tipRow.style.display = "none";
    }

    if (hiddenTipInput) hiddenTipInput.value = tip.toFixed(2);

    // 5. Grand Total Calculation
    const grandTotal = Math.max(0, taxableAmount + tax + deliveryFee + tip);
    if (totalEl) totalEl.textContent = grandTotal.toFixed(2);

    // 6. Points to Earn Indicator (10 points per dollar on subtotal)
    const pointsToEarn = Math.floor(subtotal * 10);
    if (pointsEarnedDisplay) {
      pointsEarnedDisplay.textContent = `+${pointsToEarn} pts 🪙`;
    }
  };

  // ==========================================================================
  // 7. COUPON APPLICATION
  // ==========================================================================
  window.applyCouponCode = async function () {
    const input = document.getElementById("coupon-input");
    const msgEl = document.getElementById("coupon-message");
    const hiddenCode = document.getElementById("hidden-coupon-code");

    if (!input || !input.value.trim()) return;
    const code = input.value.trim().toUpperCase();

    const subtotal = (window.cart || []).reduce(
      (sum, i) => sum + Number(i.price) * Number(i.quantity),
      0
    );

    const formData = new FormData();
    formData.append("code", code);
    formData.append("subtotal", subtotal.toString());

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        window.appliedCoupon = data;
        if (hiddenCode) hiddenCode.value = data.code;
        if (msgEl) {
          msgEl.style.color = "var(--secondary)";
          msgEl.textContent = `✓ ${data.message}`;
        }
        renderCart();
        showToast(`Coupon <strong>${data.code}</strong> applied!`, "success");
      } else {
        window.appliedCoupon = null;
        if (hiddenCode) hiddenCode.value = "";
        if (msgEl) {
          msgEl.style.color = "#C92A2A";
          msgEl.textContent = data.message || "Invalid coupon code.";
        }
        renderCart();
      }
    } catch (e) {
      console.error(e);
      if (msgEl) {
        msgEl.style.color = "#C92A2A";
        msgEl.textContent = "Error validating coupon. Please try again.";
      }
    }
  };

  // ==========================================================================
  // 8. LIVE SEARCH & CATEGORY FILTERING
  // ==========================================================================
  window.selectCategory = function (slug, btn) {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filterMenuItems();
  };

  window.clearSearchInput = function () {
    const searchInput = document.getElementById("menu-search-input");
    if (searchInput) searchInput.value = "";
    const clearBtn = document.getElementById("search-clear-btn");
    if (clearBtn) clearBtn.style.display = "none";

    // Reset to "All Items" tab
    const allTab = document.querySelector('.filter-btn[data-category="all"]');
    if (allTab) {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      allTab.classList.add("active");
    }

    filterMenuItems();
  };

  // ==========================================================================
  // 8B. WISHLIST & DIETARY FILTER SYSTEM
  // ==========================================================================
  try {
    window.crustFavorites = JSON.parse(localStorage.getItem("crustflame_favorites") || "[]");
    if (!Array.isArray(window.crustFavorites)) window.crustFavorites = [];
  } catch (e) {
    window.crustFavorites = [];
  }

  window.currentDietaryFilter = "all";

  window.updateWishlistUI = function () {
    document.querySelectorAll(".wishlist-btn").forEach((btn) => {
      const idStr = btn.id.replace("fav-btn-", "");
      const isFav = window.crustFavorites.includes(Number(idStr));
      if (isFav) {
        btn.classList.add("is-favorite");
        btn.innerHTML = "&hearts;";
        btn.style.color = "#E03131";
      } else {
        btn.classList.remove("is-favorite");
        btn.innerHTML = "&#9825;";
        btn.style.color = "";
      }
    });

    const counter = document.getElementById("fav-counter");
    if (counter) counter.textContent = window.crustFavorites.length;
  };

  window.toggleFavoriteItem = function (e, id, name) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const numId = Number(id);
    const idx = window.crustFavorites.indexOf(numId);
    if (idx >= 0) {
      window.crustFavorites.splice(idx, 1);
      window.showToast(`Removed <strong>${name}</strong> from favorites.`, "info");
    } else {
      window.crustFavorites.push(numId);
      window.showToast(`Saved <strong>${name}</strong> to your favorites! ❤️`, "success");
    }
    localStorage.setItem("crustflame_favorites", JSON.stringify(window.crustFavorites));
    updateWishlistUI();
    filterMenuItems();
  };

  window.selectDietaryFilter = function (diet, btn) {
    window.currentDietaryFilter = diet;
    document.querySelectorAll(".dietary-pill").forEach((p) => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    filterMenuItems();
  };

  window.filterMenuItems = function () {
    const searchInput = document.getElementById("menu-search-input");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const clearBtn = document.getElementById("search-clear-btn");
    const resultsCountEl = document.getElementById("search-results-count");
    const noResultsEl = document.getElementById("no-menu-results");

    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? "flex" : "none";
    }

    const activeFilterBtn = document.querySelector(".filter-btn.active");
    const selectedCategory = activeFilterBtn
      ? activeFilterBtn.getAttribute("data-category")
      : "all";

    let visibleCount = 0;
    const allCards = document.querySelectorAll(".menu-card-item");

    allCards.forEach((card) => {
      const cardCat = card.getAttribute("data-category") || "";
      const cardName = card.getAttribute("data-name") || "";
      const cardDesc = card.getAttribute("data-desc") || "";
      const cardId = Number(card.getAttribute("data-id") || 0);
      const isVeg = card.getAttribute("data-veg") === "true";
      const isSpicy = card.getAttribute("data-spicy") === "true";
      const isFeatured = card.getAttribute("data-featured") === "true";
      const isFav = (window.crustFavorites || []).includes(cardId);

      let matchesDiet = true;
      if (window.currentDietaryFilter === "veg") matchesDiet = isVeg;
      else if (window.currentDietaryFilter === "spicy") matchesDiet = isSpicy;
      else if (window.currentDietaryFilter === "featured") matchesDiet = isFeatured;
      else if (window.currentDietaryFilter === "favorites") matchesDiet = isFav;

      const matchesCat = selectedCategory === "all" || cardCat === selectedCategory;
      const matchesSearch =
        query === "" || cardName.includes(query) || cardDesc.includes(query);

      if (matchesCat && matchesSearch && matchesDiet) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (resultsCountEl) {
      if (query.length > 0 || window.currentDietaryFilter !== "all") {
        resultsCountEl.style.display = "block";
        resultsCountEl.textContent = `Showing ${visibleCount} matching item${
          visibleCount === 1 ? "" : "s"
        }`;
      } else {
        resultsCountEl.style.display = "none";
      }
    }

    if (noResultsEl) {
      noResultsEl.style.display = visibleCount === 0 ? "block" : "none";
    }
  };

  // ==========================================================================
  // 9. MOBILE NAVIGATION DRAWER
  // ==========================================================================
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileDrawer = document.getElementById("mobile-drawer");
  const mobileBackdrop = document.getElementById("mobile-backdrop");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");

  const openMobileDrawer = () => {
    if (mobileDrawer) mobileDrawer.classList.add("is-open");
    if (mobileBackdrop) mobileBackdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  const closeMobileDrawer = () => {
    if (mobileDrawer) mobileDrawer.classList.remove("is-open");
    if (mobileBackdrop) mobileBackdrop.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", openMobileDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeMobileDrawer);
  if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeMobileDrawer);

  document.querySelectorAll(".mobile-link").forEach((link) => {
    link.addEventListener("click", closeMobileDrawer);
  });

  // ==========================================================================
  // 10. REVIEWS MODAL HANDLING
  // ==========================================================================
  window.openReviewModal = async function (itemId, itemName) {
    const modal = document.getElementById("review-modal");
    const backdrop = document.getElementById("review-modal-backdrop");
    const titleEl = document.getElementById("review-modal-item-name");
    const hiddenId = document.getElementById("review-item-id");
    const listEl = document.getElementById("review-list-container");

    if (titleEl) titleEl.textContent = `Reviews: ${itemName}`;
    if (hiddenId) hiddenId.value = itemId;

    if (modal) modal.style.display = "flex";
    if (backdrop) backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";

    if (listEl) listEl.innerHTML = "<p style='color: var(--text-muted);'>Loading reviews...</p>";

    try {
      const res = await fetch(`/api/menu/items/${itemId}`);
      const data = await res.json();
      if (data.reviews && data.reviews.length > 0) {
        listEl.innerHTML = data.reviews
          .map(
            (r) => `
          <div style="border-bottom: 1px solid var(--border-color); padding: 0.65rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--text-main); font-size: 0.95rem;">${r.user_name}</strong>
              <span style="color: #F59F00; font-weight: 800; font-size: 0.88rem;">★ ${r.rating}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin: 3px 0;">${r.comment || "Great artisanal pizza!"}</p>
            <span style="font-size: 0.72rem; color: var(--text-light);">${r.date}</span>
          </div>
        `
          )
          .join("");
      } else {
        listEl.innerHTML = "<p style='color: var(--text-muted); font-size: 0.88rem;'>No reviews yet. Be the first to share your thoughts!</p>";
      }
    } catch (e) {
      if (listEl) listEl.innerHTML = "<p style='color: var(--text-muted);'>Could not load reviews.</p>";
    }
  };

  window.closeReviewModal = function () {
    const modal = document.getElementById("review-modal");
    const backdrop = document.getElementById("review-modal-backdrop");
    if (modal) modal.style.display = "none";
    if (backdrop) backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  window.submitReview = async function (e) {
    e.preventDefault();
    const itemId = document.getElementById("review-item-id").value;
    const rating = document.getElementById("review-rating-select").value;
    const comment = document.getElementById("review-comment-input").value;

    const formData = new FormData();
    formData.append("rating", rating);
    formData.append("comment", comment);

    try {
      const res = await fetch(`/api/menu/items/${itemId}/reviews`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Thank you for your rating & review! ⭐", "success");
        closeReviewModal();
        const input = document.getElementById("review-comment-input");
        if (input) input.value = "";
      } else {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/`;
        } else {
          alert(data.detail || "Could not submit review.");
        }
      }
    } catch (err) {
      alert("Error submitting review. Please sign in first.");
    }
  };

  // ==========================================================================
  // 11. CHECKOUT ORDER FORM SUBMISSION
  // ==========================================================================
  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", function (e) {
      if (!window.cart || window.cart.length === 0) {
        e.preventDefault();
        showToast("Your cart is empty. Please add items before placing an order.", "info");
        return;
      }

      const nameInput = orderForm.querySelector("[name='customer_name']");
      const emailInput = orderForm.querySelector("[name='customer_email']");
      const phoneInput = orderForm.querySelector("[name='customer_phone']");
      const addressInput = orderForm.querySelector("[name='address']");

      if (!nameInput.value.trim()) {
        e.preventDefault();
        nameInput.focus();
        showToast("Please enter your name.", "info");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value.trim())) {
        e.preventDefault();
        emailInput.focus();
        showToast("Please enter a valid email address.", "info");
        return;
      }

      if (!phoneInput || !phoneInput.value.trim()) {
        e.preventDefault();
        phoneInput.focus();
        showToast("Please enter your phone number.", "info");
        return;
      }

      if (window.currentFulfillment === "pickup") {
        if (!addressInput.value.trim()) {
          addressInput.value = "Store Pickup: 142 Artisan Boulevard, Food District";
        }
      } else {
        if (addressInput.value.trim().length < 5) {
          e.preventDefault();
          addressInput.focus();
          showToast("Please provide your complete delivery address.", "info");
          return;
        }
      }

      // Append hidden cart input with JSON payload
      const existingHidden = orderForm.querySelector("input[name='cart']");
      if (existingHidden) existingHidden.remove();

      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "cart";
      hidden.value = JSON.stringify(window.cart);
      orderForm.appendChild(hidden);

      // Loading state on button
      const submitBtn = orderForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: 6px;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg> Confirming Order...
        `;
      }
    });
  }

  // ==========================================================================
  // 12. LIVE ORDER STATUS POLLING (FOR /orders/{id} TRACKING)
  // ==========================================================================
  const trackingBar = document.getElementById("timeline-progress-bar");
  if (trackingBar) {
    const orderPathMatch = window.location.pathname.match(/\/orders\/(\d+)/);
    if (orderPathMatch && orderPathMatch[1]) {
      const orderId = orderPathMatch[1];
      const pollOrderStatus = async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/status`);
          if (res.ok) {
            const data = await res.json();
            const statusText = document.getElementById("live-status-text");
            if (statusText && data.status) {
              statusText.textContent = data.status;
            }

            const stepIndex = data.current_step_index;
            if (typeof stepIndex === "number") {
              const percentages = [0, 33, 66, 100];
              const pct = percentages[Math.min(stepIndex, 3)];
              trackingBar.style.width = `${pct * 0.8}%`;

              // Highlight nodes
              for (let i = 0; i <= 3; i++) {
                const node = document.getElementById(`step-node-${i}`);
                if (node) {
                  if (i <= stepIndex) {
                    node.style.background = "var(--gradient-fire)";
                    node.style.color = "#FFFFFF";
                    node.style.boxShadow = "0 4px 14px rgba(230, 42, 16, 0.4)";
                  } else {
                    node.style.background = "var(--bg-subtle)";
                    node.style.color = "var(--text-muted)";
                    node.style.boxShadow = "none";
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Could not poll order status:", e);
        }
      };

      // Poll every 12 seconds
      setInterval(pollOrderStatus, 12000);
    }
  }

  // ==========================================================================
  // 13. DARK / LIGHT THEME CONTROLLER
  // ==========================================================================
  const themeToggleBtn = document.getElementById("theme-toggle");
  const mobileThemeToggle = document.getElementById("mobile-theme-toggle");
  const mobileThemeEmoji = document.getElementById("mobile-theme-emoji");
  const mobileThemeText = document.getElementById("mobile-theme-text");

  function getActiveTheme() {
    return document.documentElement.getAttribute("data-theme") || 
      localStorage.getItem("crustflame_theme") || 
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function applyTheme(theme, animate = false) {
    if (animate) {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 350);
    }

    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("crustflame_theme", theme);
    } catch (e) {}

    // Update Desktop button accessibility attributes
    if (themeToggleBtn) {
      const isDark = theme === "dark";
      themeToggleBtn.setAttribute("title", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
      themeToggleBtn.setAttribute("aria-label", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
    }

    // Update Mobile switch indicators
    if (mobileThemeEmoji && mobileThemeText) {
      if (theme === "dark") {
        mobileThemeEmoji.textContent = "☀️";
        mobileThemeText.textContent = "Light Mode";
      } else {
        mobileThemeEmoji.textContent = "🌙";
        mobileThemeText.textContent = "Dark Mode";
      }
    }

    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
  }

  function toggleTheme() {
    const currentTheme = getActiveTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);

    const label = nextTheme === "dark" ? "Dark Mode activated 🌙" : "Light Mode activated ☀️";
    if (typeof window.showToast === "function") {
      window.showToast(label, "info");
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener("click", toggleTheme);
  }

  // Sync initial state
  applyTheme(getActiveTheme(), false);

  // Listen to OS system color-scheme preference changes
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      const stored = localStorage.getItem("crustflame_theme");
      if (!stored) {
        applyTheme(e.matches ? "dark" : "light", true);
      }
    });
  }

  // ==========================================================================
  // 14. INITIAL RUNS
  // ==========================================================================
  updateCartCount();
  renderCart();
  if (typeof window.updateWishlistUI === "function") {
    window.updateWishlistUI();
  }
});
