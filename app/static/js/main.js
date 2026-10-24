/**
 * Pizza Shop - Main Frontend JavaScript
 * Handles cart management, mobile navigation drawer, interactive notifications,
 * form validation, and dynamic updates.
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

    // Also update mobile drawer count if exists
    const mobileCount = document.getElementById("mobile-cart-count");
    if (mobileCount) mobileCount.textContent = totalQty;
  };

  // ---------------- Add to Cart ----------------
  window.addToCart = function (pizza_id, name, price) {
    pizza_id = Number(pizza_id);
    price = Number(price);

    let item = window.cart.find((i) => Number(i.pizza_id) === pizza_id);
    if (item) {
      item.quantity = Number(item.quantity) + 1;
    } else {
      window.cart.push({ pizza_id, name, price, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(window.cart));
    updateCartCount();
    showToast(`Added <strong>${name}</strong> to your cart!`, "success");
  };

  // ---------------- Change Quantity in Cart ----------------
  window.changeQuantity = function (pizza_id, delta) {
    pizza_id = Number(pizza_id);
    let item = window.cart.find((i) => Number(i.pizza_id) === pizza_id);
    if (!item) return;

    item.quantity = Number(item.quantity) + delta;
    if (item.quantity <= 0) {
      removeFromCart(pizza_id);
      return;
    }

    localStorage.setItem("cart", JSON.stringify(window.cart));
    renderCart();
    updateCartCount();
  };

  // ---------------- Remove from Cart ----------------
  window.removeFromCart = function (pizza_id) {
    pizza_id = Number(pizza_id);
    const itemToRemove = window.cart.find((i) => Number(i.pizza_id) === pizza_id);
    window.cart = window.cart.filter((i) => Number(i.pizza_id) !== pizza_id);
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
    const tableWrap = document.getElementById("cart-table-wrapper");
    const checkoutCard = document.getElementById("checkout-card");
    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");

    if (!tbody) return;

    if (!window.cart || window.cart.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      if (tableWrap) tableWrap.style.display = "none";
      if (checkoutCard) checkoutCard.style.display = "none";
      if (totalEl) totalEl.textContent = "0.00";
      if (subtotalEl) subtotalEl.textContent = "0.00";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (tableWrap) tableWrap.style.display = "block";
    if (checkoutCard) checkoutCard.style.display = "block";

    tbody.innerHTML = "";
    let total = 0;

    window.cart.forEach((item) => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="cart-item-title">${item.name}</div>
        </td>
        <td>
          <div class="cart-qty-control">
            <button type="button" class="cart-qty-btn" onclick="changeQuantity(${item.pizza_id}, -1)" title="Decrease quantity">&minus;</button>
            <span class="cart-qty-val">${item.quantity}</span>
            <button type="button" class="cart-qty-btn" onclick="changeQuantity(${item.pizza_id}, 1)" title="Increase quantity">&plus;</button>
          </div>
        </td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td><strong>$${lineTotal.toFixed(2)}</strong></td>
        <td style="text-align: right;">
          <button type="button" class="cart-remove-btn" onclick="removeFromCart(${item.pizza_id})" title="Remove item">
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

    if (subtotalEl) subtotalEl.textContent = total.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
  };

  // ---------------- Mobile Navigation Drawer ----------------
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileDrawer = document.getElementById("mobile-drawer");
  const mobileBackdrop = document.getElementById("mobile-backdrop");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");

  function openMobileMenu() {
    if (mobileDrawer) mobileDrawer.classList.add("is-open");
    if (mobileBackdrop) mobileBackdrop.classList.add("is-open");
    if (hamburgerBtn) hamburgerBtn.classList.add("is-active");
    document.body.style.overflow = "hidden";
  }

  function closeMobileMenu() {
    if (mobileDrawer) mobileDrawer.classList.remove("is-open");
    if (mobileBackdrop) mobileBackdrop.classList.remove("is-open");
    if (hamburgerBtn) hamburgerBtn.classList.remove("is-active");
    document.body.style.overflow = "";
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      const isOpen = mobileDrawer && mobileDrawer.classList.contains("is-open");
      if (isOpen) closeMobileMenu();
      else openMobileMenu();
    });
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeMobileMenu);
  if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeMobileMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileMenu();
  });

  // ---------------- Checkout Order Form Validation ----------------
  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", function (e) {
      if (!window.cart || window.cart.length === 0) {
        e.preventDefault();
        showToast("Your cart is empty. Add some delicious pizzas first!", "info");
        return;
      }

      const nameInput = orderForm.querySelector("[name='customer_name']");
      const emailInput = orderForm.querySelector("[name='customer_email']");
      const addressInput = orderForm.querySelector("[name='address']");

      let isValid = true;
      if (!nameInput.value.trim()) {
        isValid = false;
        nameInput.focus();
        showToast("Please enter your name.", "info");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value.trim())) {
        isValid = false;
        emailInput.focus();
        showToast("Please enter a valid email address.", "info");
        return;
      }

      if (addressInput.value.trim().length < 5) {
        isValid = false;
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
          </svg> Placing Your Order...
        `;
      }
    });
  }

  // ---------------- Live Image Preview for Pizza Form ----------------
  const imageInput = document.getElementById("pizza-image-input");
  const previewImg = document.getElementById("pizza-image-preview");
  if (imageInput && previewImg) {
    imageInput.addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          previewImg.src = e.target.result;
          previewImg.style.display = "block";
          const previewContainer = document.getElementById("image-preview-container");
          if (previewContainer) previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ---------------- Menu Filter Buttons ----------------
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (filterBtns.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const category = btn.getAttribute("data-filter");
        const cards = document.querySelectorAll(".pizza-card");
        cards.forEach((card) => {
          if (category === "all") {
            card.style.display = "flex";
          } else {
            const cardCat = card.getAttribute("data-category") || "all";
            if (cardCat.toLowerCase().includes(category.toLowerCase())) {
              card.style.display = "flex";
            } else {
              card.style.display = "none";
            }
          }
        });
      });
    });
  }

  // Initial runs
  updateCartCount();
  renderCart();
});
