// Tienda de Ropa - Core Client Application
const API_BASE = '';

// Application State
const state = {
  products: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem('tr_cart') || '[]'),
  user: JSON.parse(localStorage.getItem('tr_user') || 'null'),
  token: localStorage.getItem('tr_token') || null,
  activeCategory: 'Todos',
  searchQuery: '',
  selectedSize: 'Todas',
  priceSort: 'default',
  currentTrackingOrder: null,
  activeView: 'catalog' // 'catalog' | 'tracking'
};

// Format currency in Colombian Pesos (COP)
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

// ----------------------------------------------------
// UI Notification Toast
// ----------------------------------------------------
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white'
  };

  const icons = {
    success: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
    error: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
    info: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 font-medium text-sm ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ----------------------------------------------------
// Fetch & Filter Products
// ----------------------------------------------------
async function fetchProducts() {
  try {
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.activeCategory && state.activeCategory !== 'Todos') params.append('category', state.activeCategory);
    if (state.selectedSize && state.selectedSize !== 'Todas') params.append('size', state.selectedSize);
    if (state.priceSort && state.priceSort !== 'default') params.append('sort', state.priceSort);

    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
    const data = await res.json();
    state.products = data.products || [];
    renderProducts();
  } catch (error) {
    console.error('Error fetching products:', error);
    showToast('Error cargando los productos.', 'error');
  }
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  const countBadge = document.getElementById('products-count');
  const emptyState = document.getElementById('empty-products');

  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${state.products.length} productos`;
  }

  if (state.products.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  container.innerHTML = state.products.map(prod => {
    const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;
    const discountPercent = hasDiscount ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0;

    return `
      <div class="product-card group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col overflow-hidden">
        <!-- Image & Tags -->
        <div class="relative bg-slate-100 aspect-[4/5] overflow-hidden cursor-pointer" onclick="openProductModal('${prod.id}')">
          <img 
            src="${prod.image}" 
            alt="${prod.name}" 
            class="product-card-img w-full h-full object-cover object-center"
            loading="lazy"
          />
          <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            ${prod.tag ? `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-sm">${prod.tag}</span>` : ''}
            ${hasDiscount ? `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-600 text-white shadow-sm">-${discountPercent}%</span>` : ''}
          </div>
          <button 
            type="button"
            onclick="event.stopPropagation(); openProductModal('${prod.id}')"
            class="absolute bottom-3 right-3 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0"
            title="Vista rápida"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>

        <!-- Details -->
        <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span class="font-medium uppercase tracking-wider text-slate-400">${prod.category}</span>
              <div class="flex items-center gap-1 text-amber-500">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                <span class="font-semibold text-slate-700">${prod.rating}</span>
                <span class="text-slate-400">(${prod.reviewsCount})</span>
              </div>
            </div>

            <h3 class="font-semibold text-slate-800 text-sm sm:text-base line-clamp-1 mb-2 hover:text-blue-600 transition-colors cursor-pointer" onclick="openProductModal('${prod.id}')">
              ${prod.name}
            </h3>

            <!-- Sizes preview -->
            <div class="flex items-center gap-1 mb-3">
              ${prod.sizes.slice(0, 4).map(s => `
                <span class="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${s}</span>
              `).join('')}
              ${prod.sizes.length > 4 ? `<span class="text-[10px] text-slate-400">+${prod.sizes.length - 4}</span>` : ''}
            </div>
          </div>

          <div>
            <div class="flex items-baseline gap-2 mb-3">
              <span class="text-lg font-bold text-slate-900">${formatCurrency(prod.price)}</span>
              ${hasDiscount ? `<span class="text-xs text-slate-400 line-through">${formatCurrency(prod.originalPrice)}</span>` : ''}
            </div>

            <button 
              type="button"
              onclick="addToCart('${prod.id}', 1, '${prod.sizes[0]}', '${prod.colors[0]}')"
              class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>Agregar al carrito</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------
// Product Quick View Modal
// ----------------------------------------------------
let activeModalProduct = null;
let selectedModalSize = null;
let selectedModalColor = null;

function openProductModal(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  activeModalProduct = prod;
  selectedModalSize = prod.sizes[0];
  selectedModalColor = prod.colors[0];

  const modal = document.getElementById('product-modal');
  const content = document.getElementById('product-modal-content');

  const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <!-- Image gallery -->
      <div class="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/5]">
        <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-cover">
        ${prod.tag ? `<span class="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white">${prod.tag}</span>` : ''}
      </div>

      <!-- Info -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span class="font-semibold uppercase tracking-wider text-blue-600">${prod.category} • ${prod.subCategory}</span>
            <div class="flex items-center gap-1 text-amber-500">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span class="font-bold text-slate-800">${prod.rating}</span>
              <span class="text-slate-400">(${prod.reviewsCount} opiniones)</span>
            </div>
          </div>

          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 mb-3">${prod.name}</h2>

          <div class="flex items-baseline gap-3 mb-4">
            <span class="text-2xl font-black text-slate-900">${formatCurrency(prod.price)}</span>
            ${hasDiscount ? `<span class="text-sm text-slate-400 line-through">${formatCurrency(prod.originalPrice)}</span>` : ''}
            <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">En stock (${prod.stock} disponibles)</span>
          </div>

          <p class="text-slate-600 text-sm leading-relaxed mb-6">${prod.description}</p>

          <!-- Tallas -->
          <div class="mb-5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Selecciona tu Talla:</label>
            <div class="flex flex-wrap gap-2" id="modal-sizes-group">
              ${prod.sizes.map((s, idx) => `
                <button 
                  type="button" 
                  onclick="selectModalSize('${s}', this)"
                  class="size-pill px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${idx === 0 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400'}"
                >${s}</button>
              `).join('')}
            </div>
          </div>

          <!-- Colores -->
          <div class="mb-6">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Color seleccionado:</label>
            <div class="flex flex-wrap gap-2" id="modal-colors-group">
              ${prod.colors.map((c, idx) => `
                <button 
                  type="button" 
                  onclick="selectModalColor('${c}', this)"
                  class="color-pill px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${idx === 0 ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-400'}"
                >${c}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center gap-3">
          <div class="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button type="button" onclick="adjustModalQty(-1)" class="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold">-</button>
            <span id="modal-qty" class="px-4 py-2 font-bold text-slate-800 text-sm">1</span>
            <button type="button" onclick="adjustModalQty(1)" class="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold">+</button>
          </div>

          <button 
            type="button"
            onclick="addModalProductToCart()"
            class="flex-1 py-3 px-6 rounded-xl bg-slate-900 hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            <span>Agregar al Carrito</span>
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
  activeModalProduct = null;
}

function selectModalSize(size, btn) {
  selectedModalSize = size;
  const pills = document.querySelectorAll('#modal-sizes-group .size-pill');
  pills.forEach(p => {
    p.className = 'size-pill px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 transition-all';
  });
  btn.className = 'size-pill px-4 py-2 rounded-xl text-sm font-semibold border border-slate-900 bg-slate-900 text-white transition-all';
}

function selectModalColor(color, btn) {
  selectedModalColor = color;
  const pills = document.querySelectorAll('#modal-colors-group .color-pill');
  pills.forEach(p => {
    p.className = 'color-pill px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:border-slate-400 transition-all';
  });
  btn.className = 'color-pill px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-600 bg-blue-50 text-blue-800 font-semibold transition-all';
}

function adjustModalQty(delta) {
  const qtyEl = document.getElementById('modal-qty');
  if (!qtyEl) return;
  let current = parseInt(qtyEl.textContent) || 1;
  current = Math.max(1, Math.min(10, current + delta));
  qtyEl.textContent = current;
}

function addModalProductToCart() {
  if (!activeModalProduct) return;
  const qtyEl = document.getElementById('modal-qty');
  const qty = parseInt(qtyEl ? qtyEl.textContent : '1') || 1;

  addToCart(activeModalProduct.id, qty, selectedModalSize, selectedModalColor);
  closeProductModal();
}

// ----------------------------------------------------
// Shopping Cart
// ----------------------------------------------------
function addToCart(productId, quantity = 1, size = null, color = null) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const chosenSize = size || prod.sizes[0];
  const chosenColor = color || prod.colors[0];

  // Check if item with exact same size and color already exists
  const existingIndex = state.cart.findIndex(
    item => item.productId === productId && item.size === chosenSize && item.color === chosenColor
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      quantity,
      size: chosenSize,
      color: chosenColor,
      image: prod.image
    });
  }

  saveCart();
  renderCart();
  showToast(`"${prod.name}" agregado al carrito (${chosenSize})`, 'success');
}

function updateCartQuantity(index, delta) {
  if (!state.cart[index]) return;
  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }
  saveCart();
  renderCart();
}

function removeCartItem(index) {
  if (!state.cart[index]) return;
  const item = state.cart[index];
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
  showToast(`Eliminado "${item.name}"`, 'info');
}

function saveCart() {
  localStorage.setItem('tr_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const totalItems = state.cart.reduce((acc, i) => acc + i.quantity, 0);
  const badges = document.querySelectorAll('.cart-counter-badge');
  badges.forEach(b => {
    b.textContent = totalItems;
    b.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

function getCartCalculations() {
  const subtotal = state.cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const freeShippingThreshold = 150000;
  const shippingFee = (subtotal === 0 || subtotal >= freeShippingThreshold) ? 0 : 12000;
  const total = subtotal + shippingFee;
  return { subtotal, shippingFee, total, freeShippingThreshold };
}

function renderCart() {
  const container = document.getElementById('cart-items-list');
  const cartEmpty = document.getElementById('cart-empty-state');
  const cartFooter = document.getElementById('cart-footer');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');
  const shippingProgressBar = document.getElementById('shipping-progress-bar');
  const shippingProgressText = document.getElementById('shipping-progress-text');

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (cartEmpty) cartEmpty.classList.remove('hidden');
    if (cartFooter) cartFooter.classList.add('hidden');
    return;
  }

  if (cartEmpty) cartEmpty.classList.add('hidden');
  if (cartFooter) cartFooter.classList.remove('hidden');

  const { subtotal, shippingFee, total, freeShippingThreshold } = getCartCalculations();

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (shippingEl) shippingEl.textContent = shippingFee === 0 ? '¡GRATIS!' : formatCurrency(shippingFee);
  if (totalEl) totalEl.textContent = formatCurrency(total);

  // Free shipping progress
  if (shippingProgressBar && shippingProgressText) {
    const percent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
    shippingProgressBar.style.width = `${percent}%`;
    if (percent >= 100) {
      shippingProgressText.innerHTML = '🎉 ¡Felicidades! Tienes <strong class="text-emerald-700">Envío Gratis</strong>';
    } else {
      const remaining = freeShippingThreshold - subtotal;
      shippingProgressText.innerHTML = `Agrega <strong>${formatCurrency(remaining)}</strong> más para envío gratis`;
    }
  }

  container.innerHTML = state.cart.map((item, idx) => `
    <div class="flex gap-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
      <img src="${item.image}" alt="${item.name}" class="w-20 h-24 object-cover rounded-xl bg-slate-200">
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start gap-2">
            <h4 class="font-bold text-slate-800 text-sm line-clamp-1">${item.name}</h4>
            <button onclick="removeCartItem(${idx})" class="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 rounded bg-white text-slate-600 font-semibold border border-slate-200">Talla ${item.size}</span>
            <span class="text-xs text-slate-500">${item.color}</span>
          </div>
        </div>

        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center border border-slate-200 bg-white rounded-lg">
            <button onclick="updateCartQuantity(${idx}, -1)" class="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm">-</button>
            <span class="w-8 text-center text-xs font-bold text-slate-800">${item.quantity}</span>
            <button onclick="updateCartQuantity(${idx}, 1)" class="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm">+</button>
          </div>
          <span class="font-bold text-sm text-slate-900">${formatCurrency(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleCartDrawer(open = null) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer) return;

  const isOpen = !drawer.classList.contains('translate-x-full');
  const shouldOpen = open !== null ? open : !isOpen;

  if (shouldOpen) {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
    renderCart();
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
  }
}

// ----------------------------------------------------
// Checkout Modal & Order Placement
// ----------------------------------------------------
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Tu carrito está vacío.', 'error');
    return;
  }

  toggleCartDrawer(false);

  const modal = document.getElementById('checkout-modal');
  const orderSummaryList = document.getElementById('checkout-summary-items');
  const checkoutTotalEl = document.getElementById('checkout-total-val');
  const checkoutShippingEl = document.getElementById('checkout-shipping-val');

  const { subtotal, shippingFee, total } = getCartCalculations();

  if (checkoutTotalEl) checkoutTotalEl.textContent = formatCurrency(total);
  if (checkoutShippingEl) checkoutShippingEl.textContent = shippingFee === 0 ? 'Gratis' : formatCurrency(shippingFee);

  if (orderSummaryList) {
    orderSummaryList.innerHTML = state.cart.map(i => `
      <div class="flex items-center justify-between text-xs py-1">
        <span class="text-slate-600 truncate max-w-[200px]">${i.quantity}x ${i.name} (${i.size})</span>
        <span class="font-bold text-slate-800">${formatCurrency(i.price * i.quantity)}</span>
      </div>
    `).join('');
  }

  // Pre-fill user data if logged in
  if (state.user) {
    const nameInput = document.getElementById('shipping-name');
    const emailInput = document.getElementById('shipping-email');
    if (nameInput && !nameInput.value) nameInput.value = state.user.name;
    if (emailInput && !emailInput.value) emailInput.value = state.user.email;
  }

  modal.classList.remove('hidden');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('shipping-name').value.trim();
  const email = document.getElementById('shipping-email').value.trim();
  const phone = document.getElementById('shipping-phone').value.trim();
  const address = document.getElementById('shipping-address').value.trim();
  const city = document.getElementById('shipping-city').value.trim();
  const notes = document.getElementById('shipping-notes').value.trim();

  const paymentMethodRadio = document.querySelector('input[name="payment-method"]:checked');
  const paymentMethod = paymentMethodRadio ? paymentMethodRadio.value : 'Tarjeta de Crédito';

  if (!name || !email || !phone || !address || !city) {
    showToast('Por favor completa todos los campos de envío.', 'error');
    return;
  }

  const orderPayload = {
    items: state.cart,
    shipping: { fullName: name, email, phone, address, city, notes },
    paymentMethod
  };

  const submitBtn = document.getElementById('btn-submit-order');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    <span>Procesando pedido...</span>
  `;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al procesar la compra');
    }

    // Success! Clear cart
    state.cart = [];
    saveCart();
    renderCart();

    closeCheckoutModal();
    openOrderSuccessModal(data.order);
    showToast('¡Compra confirmada exitosamente!', 'success');
  } catch (err) {
    console.error('Order error:', err);
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

function openOrderSuccessModal(order) {
  const modal = document.getElementById('order-success-modal');
  const orderIdSpan = document.getElementById('success-order-id');
  const orderTotalSpan = document.getElementById('success-order-total');
  const trackBtn = document.getElementById('btn-track-success-order');

  if (orderIdSpan) orderIdSpan.textContent = order.trackingNumber;
  if (orderTotalSpan) orderTotalSpan.textContent = formatCurrency(order.total);

  if (trackBtn) {
    trackBtn.onclick = () => {
      closeOrderSuccessModal();
      navigateToTracking(order.trackingNumber);
    };
  }

  modal.classList.remove('hidden');
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (modal) modal.classList.add('hidden');
}

// ----------------------------------------------------
// Tracking System (Requisito: Consultar estado del pedido)
// ----------------------------------------------------
function navigateToTracking(trackingCode = null) {
  state.activeView = 'tracking';
  document.getElementById('view-catalog').classList.add('hidden');
  document.getElementById('view-tracking').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (trackingCode) {
    const input = document.getElementById('tracking-input');
    if (input) input.value = trackingCode;
    trackOrder(trackingCode);
  }
}

function navigateToCatalog() {
  state.activeView = 'catalog';
  document.getElementById('view-tracking').classList.add('hidden');
  document.getElementById('view-catalog').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function trackOrder(code = null) {
  const input = document.getElementById('tracking-input');
  const trackingNumber = (code || (input ? input.value : '')).trim();

  if (!trackingNumber) {
    showToast('Por favor ingresa un código de pedido.', 'error');
    return;
  }

  const resultContainer = document.getElementById('tracking-result');
  const emptyPrompt = document.getElementById('tracking-empty-prompt');
  const errorBox = document.getElementById('tracking-error-box');

  try {
    const res = await fetch(`${API_BASE}/api/orders/track/${encodeURIComponent(trackingNumber)}`);
    const data = await res.json();

    if (!res.ok) {
      if (resultContainer) resultContainer.classList.add('hidden');
      if (emptyPrompt) emptyPrompt.classList.add('hidden');
      if (errorBox) {
        errorBox.textContent = data.error || 'Pedido no encontrado.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    if (errorBox) errorBox.classList.add('hidden');
    if (emptyPrompt) emptyPrompt.classList.add('hidden');

    state.currentTrackingOrder = data.order;
    renderTrackingResult(data.order, data.steps, data.currentStepIndex);

    if (resultContainer) resultContainer.classList.remove('hidden');
  } catch (err) {
    showToast('Error consultando el pedido.', 'error');
  }
}

function renderTrackingResult(order, steps, currentStepIndex) {
  // Stepper UI
  const stepperContainer = document.getElementById('tracking-steps-container');
  const progressPercent = Math.round((currentStepIndex / (steps.length - 1)) * 100);

  // Status badge colors
  const statusColors = {
    'Recibido': 'bg-blue-100 text-blue-800 border-blue-200',
    'En preparación': 'bg-amber-100 text-amber-800 border-amber-200',
    'Enviado': 'bg-purple-100 text-purple-800 border-purple-200',
    'En reparto': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Entregado': 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  const statusIcons = {
    'Recibido': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    'En preparación': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>',
    'Enviado': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM5 11l2-7h9l3 7M5 11h14M5 11v6h14v-6"></path></svg>',
    'En reparto': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
    'Entregado': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
  };

  document.getElementById('track-order-num').textContent = order.trackingNumber;
  document.getElementById('track-order-date').textContent = new Date(order.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('track-order-est').textContent = order.estimatedDelivery;
  document.getElementById('track-order-courier').textContent = order.courier;

  const currentStatusBadge = document.getElementById('track-status-badge');
  currentStatusBadge.className = `px-3.5 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColors[order.status] || 'bg-slate-100 text-slate-800'}`;
  currentStatusBadge.textContent = order.status;

  // Render Visual Stepper
  stepperContainer.innerHTML = `
    <!-- Desktop / Tablet Stepper -->
    <div class="relative mb-10 hidden sm:block">
      <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
        <div style="width: ${progressPercent}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-700"></div>
      </div>
      <div class="flex justify-between -mt-6">
        ${steps.map((s, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          let circleClass = 'bg-slate-200 text-slate-400 border-2 border-white';
          if (isDone) circleClass = 'bg-emerald-500 text-white shadow-md';
          if (isCurrent) circleClass = 'bg-blue-600 text-white shadow-lg pulse-active-step scale-110';

          return `
            <div class="flex flex-col items-center w-24 text-center">
              <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all ${circleClass}">
                ${statusIcons[s.key] || '<span class="text-xs font-bold">' + (idx + 1) + '</span>'}
              </div>
              <span class="text-xs font-bold mt-2 ${isCurrent ? 'text-blue-600' : isDone ? 'text-emerald-700' : 'text-slate-400'}">${s.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Mobile Stepper List -->
    <div class="sm:hidden space-y-3 mb-6">
      ${steps.map((s, idx) => {
        const isDone = idx < currentStepIndex;
        const isCurrent = idx === currentStepIndex;

        let badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200';
        if (isDone) badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
        if (isCurrent) badgeStyle = 'bg-blue-50 text-blue-700 border-blue-400 font-bold';

        return `
          <div class="flex items-center gap-3 p-3 rounded-xl border ${badgeStyle}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}">
              ${statusIcons[s.key]}
            </div>
            <div class="flex-1">
              <div class="text-sm font-semibold">${s.label}</div>
              <div class="text-xs opacity-75">${isDone ? 'Completado' : isCurrent ? 'Estado actual' : 'Pendiente'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Timeline History
  const timelineContainer = document.getElementById('track-timeline-history');
  if (timelineContainer) {
    timelineContainer.innerHTML = (order.history || []).slice().reverse().map(h => `
      <div class="relative pl-6 pb-6 border-l-2 border-blue-500 last:border-transparent last:pb-0">
        <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
        <div class="text-xs text-slate-400 font-medium mb-1">
          ${new Date(h.timestamp).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <h5 class="text-sm font-bold text-slate-800">${h.title}</h5>
        <p class="text-xs text-slate-600 mt-1">${h.description}</p>
      </div>
    `).join('');
  }

  // Shipping & Items info
  const shippingInfoContainer = document.getElementById('track-shipping-address');
  if (shippingInfoContainer && order.shipping) {
    shippingInfoContainer.innerHTML = `
      <div class="text-slate-800 font-bold">${order.shipping.fullName}</div>
      <div class="text-slate-600">${order.shipping.address}</div>
      <div class="text-slate-600">${order.shipping.city}</div>
      <div class="text-slate-500 text-xs mt-1">Tel: ${order.shipping.phone}</div>
      ${order.shipping.notes ? `<div class="text-slate-500 text-xs italic mt-1">Notas: "${order.shipping.notes}"</div>` : ''}
    `;
  }

  const itemsList = document.getElementById('track-items-list');
  if (itemsList) {
    itemsList.innerHTML = order.items.map(item => `
      <div class="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
        <div class="flex items-center gap-2">
          <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded-lg bg-slate-100">
          <div>
            <div class="font-bold text-slate-800">${item.name}</div>
            <div class="text-slate-500">Talla: ${item.size} • Cant: ${item.quantity}</div>
          </div>
        </div>
        <span class="font-bold text-slate-800">${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `).join('');
  }

  // Total summary
  const summaryTotalEl = document.getElementById('track-total-val');
  if (summaryTotalEl) summaryTotalEl.textContent = formatCurrency(order.total);
}

// Interactive Status Advance for Demo & Testing
async function advanceOrderStatus() {
  if (!state.currentTrackingOrder) return;
  const btn = document.getElementById('btn-advance-status');
  const origText = btn.innerHTML;
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(state.currentTrackingOrder.trackingNumber)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.currentTrackingOrder = data.order;
    // Re-render
    const stepsRes = await fetch(`${API_BASE}/api/orders/track/${encodeURIComponent(data.order.trackingNumber)}`);
    const stepsData = await stepsRes.json();
    renderTrackingResult(stepsData.order, stepsData.steps, stepsData.currentStepIndex);

    showToast(`Estado actualizado: ${data.order.status}`, 'success');
  } catch (err) {
    showToast('Error al avanzar el estado.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

// ----------------------------------------------------
// Authentication (Requisito: Registro e Inicio de sesión)
// ----------------------------------------------------
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  toggleAuthMode(mode);
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('login-form-container');
  const registerForm = document.getElementById('register-form-container');
  const modalTitle = document.getElementById('auth-modal-title');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    modalTitle.textContent = 'Crear cuenta nueva';
  } else {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    modalTitle.textContent = 'Iniciar sesión';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    setAuthenticatedUser(data.user, data.token);
    closeAuthModal();
    showToast(`¡Bienvenido de nuevo, ${data.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  if (password !== passwordConfirm) {
    showToast('Las contraseñas no coinciden.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al registrarse');
    }

    setAuthenticatedUser(data.user, data.token);
    closeAuthModal();
    showToast(`¡Registro exitoso! Bienvenido a la tienda, ${data.user.name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Instant Demo Login
function fillDemoLogin() {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = 'cliente@demo.com';
  if (passInput) passInput.value = 'demo1234';
  const form = document.getElementById('form-login');
  if (form) form.requestSubmit();
}

function setAuthenticatedUser(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('tr_user', JSON.stringify(user));
  localStorage.setItem('tr_token', token);
  renderAuthHeader();
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('tr_user');
  localStorage.removeItem('tr_token');
  renderAuthHeader();
  showToast('Has cerrado sesión correctamente.', 'info');
}

function renderAuthHeader() {
  const guestArea = document.getElementById('auth-guest-area');
  const userArea = document.getElementById('auth-user-area');
  const userNameDisplay = document.getElementById('auth-user-name');

  if (state.user) {
    if (guestArea) guestArea.classList.add('hidden');
    if (userArea) userArea.classList.remove('hidden');
    if (userNameDisplay) userNameDisplay.textContent = state.user.name;
  } else {
    if (guestArea) guestArea.classList.remove('hidden');
    if (userArea) userArea.classList.add('hidden');
  }
}

// ----------------------------------------------------
// My Orders Modal
// ----------------------------------------------------
async function openMyOrdersModal() {
  if (!state.user || !state.token) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('my-orders-modal');
  const list = document.getElementById('my-orders-list');
  const empty = document.getElementById('my-orders-empty');

  modal.classList.remove('hidden');
  list.innerHTML = '<div class="text-center py-8 text-slate-400">Cargando pedidos...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    const orders = data.orders || [];

    if (orders.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = orders.map(ord => `
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold text-slate-900">${ord.trackingNumber}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">${ord.status}</span>
          </div>
          <div class="text-xs text-slate-500">${new Date(ord.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="text-xs text-slate-600 mt-2">${ord.items.length} prenda(s) • Total: <strong>${formatCurrency(ord.total)}</strong></div>
        </div>
        <button 
          onclick="closeMyOrdersModal(); navigateToTracking('${ord.trackingNumber}')"
          class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          <span>Rastrear Pedido</span>
        </button>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<div class="text-center py-6 text-rose-500">Error al consultar pedidos.</div>';
  }
}

function closeMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  if (modal) modal.classList.add('hidden');
}

// ----------------------------------------------------
// Event Listeners & Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Category tabs
  const categoryButtons = document.querySelectorAll('.category-filter-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => {
        b.className = 'category-filter-btn px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-white text-slate-600 border border-slate-200 hover:border-slate-300 transition-all';
      });
      btn.className = 'category-filter-btn px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-900 text-white shadow-sm transition-all';
      state.activeCategory = btn.dataset.category;
      fetchProducts();
    });
  });

  // Search input live debouncing
  const searchInput = document.getElementById('global-search-input');
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        fetchProducts();
      }, 250);
    });
  }

  // Size filter
  const sizeSelect = document.getElementById('filter-size');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      state.selectedSize = e.target.value;
      fetchProducts();
    });
  }

  // Sort filter
  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.priceSort = e.target.value;
      fetchProducts();
    });
  }

  // Form submits
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckoutSubmit);

  const loginForm = document.getElementById('form-login');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('form-register');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Initial render
  renderAuthHeader();
  updateCartBadge();
  renderCart();
  fetchProducts();
});
