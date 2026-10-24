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
  // 4. PIZZA CUSTOMIZER MODAL ENGINE (HERO FEATURE)
  // ==========================================================================
  window.activeModalPizza = null;
  window.modalItemQty = 1;

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

    // Reset size to Regular
    const regularRadio = document.querySelector('input[name="modal_size"][value="Regular"]');
    if (regularRadio) regularRadio.checked = true;

    // Reset crust to first option
    const firstCrust = document.querySelector('input[name="modal_crust"]');
    if (firstCrust) firstCrust.checked = true;

    // Uncheck extra toppings
    document.querySelectorAll(".modal-topping-checkbox").forEach((cb) => {
      cb.checked = false;
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

    // 3. Extra toppings
    let toppingsCount = 0;
    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      unitPrice += Number(cb.getAttribute("data-price") || 0.0);
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
      let topText = toppingsCount > 0 ? ` • +${toppingsCount} Topping${toppingsCount > 1 ? "s" : ""}` : "";
      summaryPill.textContent = `${sizeName} • ${crustName}${topText}`;
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

    const toppings = [];
    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      toppings.push({
        topping_id: Number(cb.value),
        topping_name: cb.getAttribute("data-name"),
        price: Number(cb.getAttribute("data-price") || 0.0)
      });
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

  window.renderCart = function () {
    const tbody = document.getElementById("cart-items");
    const emptyState = document.getElementById("cart-empty-state");
    const mainLayout = document.getElementById("cart-main-layout");
    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    const taxEl = document.getElementById("tax-amount");
    const deliveryDisplay = document.getElementById("delivery-fee-display");
    const discountRow = document.getElementById("discount-row");
    const discountCodeBadge = document.getElementById("discount-code-badge");
    const discountAmountEl = document.getElementById("discount-amount");

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
      if (item.toppings && item.toppings.length > 0) {
        const topNames = item.toppings.map((t) => t.topping_name).join(", ");
        customTags += `<div style="margin-top: 4px;"><span class="cart-custom-tag">+ ${topNames}</span></div>`;
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

    // Apply Coupon Discount Calculation
    let discount = 0;
    if (window.appliedCoupon) {
      if (window.appliedCoupon.discount_type === "percent") {
        discount = (window.appliedCoupon.discount_value / 100.0) * subtotal;
      } else {
        discount = Math.min(window.appliedCoupon.discount_value, subtotal);
      }
      discount = Math.round(discount * 100) / 100;

      if (discountRow) discountRow.style.display = "flex";
      if (discountCodeBadge) discountCodeBadge.textContent = window.appliedCoupon.code;
      if (discountAmountEl) discountAmountEl.textContent = discount.toFixed(2);
    } else {
      if (discountRow) discountRow.style.display = "none";
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.08 * 100) / 100;
    if (taxEl) taxEl.textContent = tax.toFixed(2);

    // Free delivery on orders $50+
    const deliveryFee = subtotal >= 50.0 ? 0.0 : 3.5;
    if (deliveryDisplay) {
      deliveryDisplay.textContent = deliveryFee === 0.0 ? "FREE" : "$3.50";
      deliveryDisplay.style.color = deliveryFee === 0.0 ? "var(--secondary)" : "inherit";
    }

    const grandTotal = taxableAmount + tax + deliveryFee;
    if (totalEl) totalEl.textContent = grandTotal.toFixed(2);
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

      const matchesCat = selectedCategory === "all" || cardCat === selectedCategory;
      const matchesSearch =
        query === "" || cardName.includes(query) || cardDesc.includes(query);

      if (matchesCat && matchesSearch) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (resultsCountEl) {
      if (query.length > 0) {
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

      if (addressInput.value.trim().length < 5) {
        e.preventDefault();
        addressInput.focus();
        showToast("Please provide your complete delivery address.", "info");
        return;
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
  // 13. INITIAL RUNS
  // ==========================================================================
  updateCartCount();
  renderCart();
});
