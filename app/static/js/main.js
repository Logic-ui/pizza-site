// app/static/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  window.cart = JSON.parse(localStorage.getItem('cart') || '[]');

  window.updateCartCount = function() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const totalQty = cart.reduce((s,i) => s + (Number(i.quantity)||0), 0);
    el.textContent = totalQty;
  };

  window.addToCart = function(pizza_id, name, price) {
    pizza_id = Number(pizza_id);
    price = Number(price);
    let item = cart.find(i => Number(i.pizza_id) === pizza_id);
    if (item) item.quantity = Number(item.quantity) + 1;
    else cart.push({pizza_id, name, price, quantity: 1});
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert(name + ' added to cart');
  };

  // For cart page: render table
  function renderCart() {
    const tbody = document.getElementById('cart-items');
    if (!tbody) return;
    tbody.innerHTML = '';
    cart.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>$${(item.price * item.quantity).toFixed(2)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.pizza_id})">Remove</button></td>
      `;
      tbody.appendChild(tr);
    });
    const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);
    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = total.toFixed(2);
  }

  window.removeFromCart = function(pizza_id) {
    cart = cart.filter(i => Number(i.pizza_id) !== Number(pizza_id));
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
  };

  // Before order form submit, add hidden 'cart' input
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', function(e) {
      if (!cart || cart.length === 0) {
        e.preventDefault();
        alert('Your cart is empty.');
        return;
      }
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'cart';
      hidden.value = JSON.stringify(cart);
      orderForm.appendChild(hidden);
    });
  }

  // initial render
  updateCartCount();
  renderCart();
});