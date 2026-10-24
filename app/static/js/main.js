/**
 * Pizza Shop - Enterprise Frontend JavaScript
 * Handles cart management, pizza customization, coupon discounts, order tracking,
 * real-time price calculation, reviews, drawer navigation, and form validation.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ---------------- Cart State Initialization ----------------
  try {
    window.cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!Array.isArray(window.cart)) window.cart = [];
  } catch (e) {
    console.error("Error reading cart from localStorage:", e);
    window.cart = [];
  }

  window.appliedCoupon = null;

  // ---------------- Toast Notifications ----------------
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
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 250);
      }
    }, 3500);
  };

  // ---------------- Update Cart Count Badge ----------------
  window.updateCartCount = function () {
    const el = document.getElementById("cart-count");
    if (!el) return;
    const totalQty = window.cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    el.textContent = totalQty;

    // Trigger bounce animation
    el.classList.remove("bounce");
    void el.offsetWidth; // Force reflow
    el.classList.add("bounce");

    const mobileCount = document.getElementById("mobile-cart-count");
    if (mobileCount) mobileCount.textContent = totalQty;
  };

  // ---------------- Simple Add to Cart ----------------
  window.addToCart = function (pizza_id, name, price) {
    pizza_id = Number(pizza_id);
    price = Number(price);

    let item = window.cart.find((i) => Number(i.pizza_id) === pizza_id && !i.is_customized);
    if (item) {
      item.quantity = Number(item.quantity) + 1;
    } else {
      window.cart.push({
        pizza_id,
        name,
        price,
        quantity: 1,
        size: "Regular",
        toppings: []
      });
    }

    localStorage.setItem("cart", JSON.stringify(window.cart));
    updateCartCount();
    showToast(`Added <strong>${name}</strong> to your cart!`, "success");
  };

  // ---------------- Customization Modal Logic ----------------
  window.activeModalPizza = null;

  window.openCustomizationModal = function (id, name, basePrice, imageUrl, desc) {
    window.activeModalPizza = { id, name, basePrice };

    const modal = document.getElementById("custom-modal");
    const backdrop = document.getElementById("custom-modal-backdrop");
    const titleEl = document.getElementById("modal-pizza-name");

    if (titleEl) titleEl.textContent = "Customize: " + name;

    // Reset size to Regular
    const regularSize = document.querySelector('input[name="modal_size"][value="Regular"]');
    if (regularSize) regularSize.checked = true;

    // Uncheck extra toppings
    document.querySelectorAll(".modal-topping-checkbox").forEach((cb) => (cb.checked = false));

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
  };

  window.recalculateModalPrice = function () {
    if (!window.activeModalPizza) return;

    let base = Number(window.activeModalPizza.basePrice);

    // Size multiplier
    const selectedSize = document.querySelector('input[name="modal_size"]:checked');
    const sizeMultiplier = selectedSize ? Number(selectedSize.getAttribute("data-mult") || 1.0) : 1.0;
    let price = base * sizeMultiplier;

    // Crust price modifier
    const selectedCrust = document.querySelector('input[name="modal_crust"]:checked');
    if (selectedCrust) {
      price += Number(selectedCrust.getAttribute("data-price") || 0.0);
    }

    // Extra toppings
    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      price += Number(cb.getAttribute("data-price") || 0.0);
    });

    const displayEl = document.getElementById("modal-calculated-price");
    if (displayEl) {
      displayEl.textContent = "$" + price.toFixed(2);
    }
    return price;
  };

  window.addCustomizedPizzaToCart = function () {
    if (!window.activeModalPizza) return;

    const finalPrice = recalculateModalPrice();
    const sizeEl = document.querySelector('input[name="modal_size"]:checked');
    const size = sizeEl ? sizeEl.value : "Regular";

    const crustEl = document.querySelector('input[name="modal_crust"]:checked');
    const crust_id = crustEl ? Number(crustEl.value) : null;
    const crust_name = crustEl ? crustEl.getAttribute("data-name") : null;

    const toppings = [];
    document.querySelectorAll(".modal-topping-checkbox:checked").forEach((cb) => {
      toppings.push({
        topping_id: Number(cb.value),
        topping_name: cb.getAttribute("data-name"),
        price: Number(cb.getAttribute("data-price") || 0.0)
      });
    });

    window.cart.push({
      pizza_id: window.activeModalPizza.id,
      name: window.activeModalPizza.name,
      price: finalPrice,
      quantity: 1,
      size,
      crust_id,
      crust_name,
      toppings,
      is_customized: true
    });

    localStorage.setItem("cart", JSON.stringify(window.cart));
    updateCartCount();
    closeCustomizationModal();
    showToast(`Added custom <strong>${window.activeModalPizza.name}</strong> to cart!`, "success");
  };

  // ---------------- Change Quantity in Cart ----------------
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

  // ---------------- Remove from Cart ----------------
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

  // ---------------- Render Cart Page ----------------
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
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;

      let customDetails = "";
      if (item.size && item.size !== "Regular") {
        customDetails += `<span style="font-size: 0.8rem; color: var(--text-muted);">${item.size}</span> `;
      }
      if (item.crust_name) {
        customDetails += `<span style="font-size: 0.8rem; color: var(--text-muted);">&bull; ${item.crust_name}</span> `;
      }
      if (item.toppings && item.toppings.length > 0) {
        const topNames = item.toppings.map((t) => t.topping_name).join(", ");
        customDetails += `<div style="font-size: 0.78rem; color: var(--text-muted);">+ ${topNames}</div>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="cart-item-title">${item.name}</div>
          ${customDetails}
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
          <button type="button" class="cart-remove-btn" onclick="removeFromCart(${index})" title="Remove item">
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

    // Calculate coupon discount
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

    const deliveryFee = subtotal >= 50.0 ? 0.0 : 3.5;
    if (deliveryDisplay) {
      deliveryDisplay.textContent = deliveryFee === 0.0 ? "FREE" : "$3.50";
      deliveryDisplay.style.color = deliveryFee === 0.0 ? "var(--secondary)" : "inherit";
    }

    const grandTotal = taxableAmount + tax + deliveryFee;
    if (totalEl) totalEl.textContent = grandTotal.toFixed(2);
  };

  // ---------------- Coupon Code Application ----------------
  window.applyCouponCode = async function () {
    const input = document.getElementById("coupon-input");
    const msgEl = document.getElementById("coupon-message");
    const hiddenCode = document.getElementById("hidden-coupon-code");

    if (!input || !input.value.trim()) return;
    const code = input.value.trim().toUpperCase();

    const subtotal = window.cart.reduce((s, i) => s + i.price * i.quantity, 0);

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

  // ---------------- Menu Filtering & Live Search ----------------
  window.selectCategory = function (slug, btn) {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filterMenuItems();
  };

  window.filterMenuItems = function () {
    const searchInput = document.getElementById("menu-search-input");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const activeFilterBtn = document.querySelector(".filter-btn.active");
    const selectedCategory = activeFilterBtn ? activeFilterBtn.getAttribute("data-category") : "all";

    document.querySelectorAll(".menu-card-item").forEach((card) => {
      const cardCat = card.getAttribute("data-category") || "";
      const cardName = card.getAttribute("data-name") || "";
      const cardDesc = card.getAttribute("data-desc") || "";

      const matchesCat = selectedCategory === "all" || cardCat === selectedCategory;
      const matchesSearch = query === "" || cardName.includes(query) || cardDesc.includes(query);

      if (matchesCat && matchesSearch) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  };

  // ---------------- Review Modal Handling ----------------
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
          <div style="border-bottom: 1px solid var(--border-color); padding: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${r.user_name}</strong>
              <span style="color: #F59F00; font-weight: 700;">★ ${r.rating}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 2px 0;">${r.comment || "Great pizza!"}</p>
            <span style="font-size: 0.72rem; color: #adb5bd;">${r.date}</span>
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
        showToast("Thank you for your rating & review!", "success");
        closeReviewModal();
        document.getElementById("review-comment-input").value = "";
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

  // ---------------- Checkout Order Form Submission ----------------
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

  // Initial runs
  updateCartCount();
  renderCart();
});
