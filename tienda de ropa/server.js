const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const INITIAL_PRODUCTS_FILE = path.join(__dirname, 'data', 'initial-products.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const JWT_SECRET = process.env.JWT_SECRET || 'tienda-ropa-secret-key-928475892';

// ----------------------------------------------------
// Database initialization and persistence
// ----------------------------------------------------
function initDatabase() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let db = { users: [], products: [], orders: [] };

  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
      console.warn('Corrupted db.json, recreating...');
    }
  }

  // Load initial products if catalog is empty
  if (!db.products || db.products.length === 0) {
    if (fs.existsSync(INITIAL_PRODUCTS_FILE)) {
      try {
        const initialProducts = JSON.parse(fs.readFileSync(INITIAL_PRODUCTS_FILE, 'utf8'));
        db.products = initialProducts;
      } catch (err) {
        console.error('Error loading initial products:', err);
      }
    }
  }

  if (!db.users) db.users = [];
  if (!db.orders) db.orders = [];

  // Create demo user if none exists
  if (db.users.length === 0) {
    const demoPasswordHash = hashPassword('demo1234');
    db.users.push({
      id: 'usr-demo1',
      name: 'Cliente Demo',
      email: 'cliente@demo.com',
      password: demoPasswordHash,
      createdAt: new Date().toISOString()
    });
  }

  // Create initial demo order so tracking can be tested immediately!
  if (db.orders.length === 0 && db.products.length > 0) {
    const demoOrder = createOrderRecord({
      userId: 'usr-demo1',
      items: [
        {
          productId: db.products[0].id,
          name: db.products[0].name,
          price: db.products[0].price,
          quantity: 1,
          size: 'M',
          color: db.products[0].colors[0],
          image: db.products[0].image
        }
      ],
      shipping: {
        fullName: 'Cliente Demo',
        email: 'cliente@demo.com',
        phone: '310 555 1234',
        address: 'Calle 72 # 10-34, Apto 402',
        city: 'Bogotá D.C.',
        notes: 'Portería 24 horas'
      },
      paymentMethod: 'Tarjeta de Crédito'
    }, 'ORD-78420');

    // Give it step 2 ("Enviado") for instant rich tracking demonstration
    demoOrder.status = 'Enviado';
    demoOrder.history.push({
      status: 'En preparación',
      title: 'Prendas empacadas en bodega',
      description: 'El paquete fue verificado y sellado con control de calidad.',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
    });
    demoOrder.history.push({
      status: 'Enviado',
      title: 'Entregado a la empresa de transporte',
      description: 'Guía de despacho #CO-891024 asignada a Servientrega Express.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    });

    db.orders.push(demoOrder);
  }

  saveDatabase(db);
  return db;
}

function getDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    return initDatabase();
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return initDatabase();
  }
}

function saveDatabase(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ----------------------------------------------------
// Security: Password Hashing (scrypt) & Token signing
// ----------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const hashBuffer = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch (e) {
    return false;
  }
}

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expectedSig !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return verifyToken(token);
}

// ----------------------------------------------------
// Order helpers
// ----------------------------------------------------
const ORDER_STEPS = [
  { key: 'Recibido', label: 'Pedido Confirmado', icon: 'check-circle' },
  { key: 'En preparación', label: 'En Preparación', icon: 'box' },
  { key: 'Enviado', label: 'En Camino / Enviado', icon: 'truck' },
  { key: 'En reparto', label: 'En Reparto Local', icon: 'map-pin' },
  { key: 'Entregado', label: 'Entregado', icon: 'home' }
];

function createOrderRecord(data, customId = null) {
  const trackingNumber = customId || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
  const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shippingFee = subtotal >= 150000 ? 0 : 12000;
  const total = subtotal + shippingFee;

  const now = new Date();
  const estimatedDelivery = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    id: trackingNumber,
    trackingNumber: trackingNumber,
    userId: data.userId || null,
    items: data.items,
    subtotal,
    shippingFee,
    total,
    shipping: data.shipping,
    paymentMethod: data.paymentMethod || 'Tarjeta de Crédito / Débito',
    status: 'Recibido',
    createdAt: now.toISOString(),
    estimatedDelivery: estimatedDelivery.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    courier: 'Coordinadora / Servientrega Express',
    history: [
      {
        status: 'Recibido',
        title: 'Pedido recibido con éxito',
        description: 'Hemos confirmado el pago y registrado tu compra en el sistema.',
        timestamp: now.toISOString()
      }
    ]
  };
}

// ----------------------------------------------------
// Request handling
// ----------------------------------------------------
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(json);
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acceso denegado');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for single page application routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('404 Archivo no encontrado');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Fast caching headers
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ----------------------------------------------------
// HTTP Server
// ----------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // ---------------- API ROUTES ----------------
  if (pathname.startsWith('/api/')) {
    const db = getDatabase();

    // 1. REGISTER: POST /api/auth/register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { name, email, password } = body;

        if (!name || !email || !password) {
          return sendJson(res, 400, { error: 'Nombre, correo electrónico y contraseña son requeridos.' });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: 'La contraseña debe tener mínimo 6 caracteres.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
        if (existing) {
          return sendJson(res, 409, { error: 'El correo electrónico ya se encuentra registrado.' });
        }

        const newUser = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: normalizedEmail,
          password: hashPassword(password),
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        saveDatabase(db);

        const token = generateToken({ id: newUser.id, email: newUser.email, name: newUser.name });
        return sendJson(res, 201, {
          message: 'Usuario registrado exitosamente',
          user: { id: newUser.id, name: newUser.name, email: newUser.email },
          token
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Error al procesar el registro.' });
      }
    }

    // 2. LOGIN: POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJson(res, 400, { error: 'Por favor ingresa tu correo y contraseña.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!user || !verifyPassword(password, user.password)) {
          return sendJson(res, 401, { error: 'Credenciales inválidas. Revisa tu correo y contraseña.' });
        }

        const token = generateToken({ id: user.id, email: user.email, name: user.name });
        return sendJson(res, 200, {
          message: 'Inicio de sesión exitoso',
          user: { id: user.id, name: user.name, email: user.email },
          token
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Error al iniciar sesión.' });
      }
    }

    // 3. ME: GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const auth = getAuthUser(req);
      if (!auth) {
        return sendJson(res, 401, { error: 'Sesión no válida o expirada.' });
      }
      const user = db.users.find(u => u.id === auth.id);
      if (!user) {
        return sendJson(res, 404, { error: 'Usuario no encontrado.' });
      }
      return sendJson(res, 200, {
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
      });
    }

    // 4. GET /api/products (Catalogue + Search + Filters)
    if (pathname === '/api/products' && req.method === 'GET') {
      let filtered = [...db.products];

      const search = urlObj.searchParams.get('search');
      const category = urlObj.searchParams.get('category');
      const minPrice = parseFloat(urlObj.searchParams.get('minPrice'));
      const maxPrice = parseFloat(urlObj.searchParams.get('maxPrice'));
      const size = urlObj.searchParams.get('size');
      const sort = urlObj.searchParams.get('sort');

      // Search
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
          (p.colors && p.colors.some(c => c.toLowerCase().includes(q)))
        );
      }

      // Category
      if (category && category !== 'Todos') {
        filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }

      // Price range
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(p => p.price >= minPrice);
      }
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(p => p.price <= maxPrice);
      }

      // Size
      if (size && size !== 'Todas') {
        filtered = filtered.filter(p => p.sizes && p.sizes.includes(size));
      }

      // Sort
      if (sort === 'price_asc') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === 'price_desc') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating_desc') {
        filtered.sort((a, b) => b.rating - a.rating);
      } else if (sort === 'name_asc') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      return sendJson(res, 200, {
        total: filtered.length,
        products: filtered
      });
    }

    // 5. GET /api/products/:id
    if (pathname.startsWith('/api/products/') && req.method === 'GET') {
      const id = pathname.replace('/api/products/', '');
      const product = db.products.find(p => p.id === id);
      if (!product) {
        return sendJson(res, 404, { error: 'Producto no encontrado.' });
      }
      return sendJson(res, 200, product);
    }

    // 6. CREATE ORDER: POST /api/orders
    if (pathname === '/api/orders' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { items, shipping, paymentMethod } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return sendJson(res, 400, { error: 'El carrito no contiene productos.' });
        }
        if (!shipping || !shipping.fullName || !shipping.address || !shipping.city || !shipping.phone) {
          return sendJson(res, 400, { error: 'Todos los datos de envío son obligatorios.' });
        }

        const auth = getAuthUser(req);
        const orderData = {
          userId: auth ? auth.id : null,
          items,
          shipping,
          paymentMethod: paymentMethod || 'Tarjeta'
        };

        const newOrder = createOrderRecord(orderData);
        db.orders.unshift(newOrder);

        // Update product stocks
        items.forEach(item => {
          const prod = db.products.find(p => p.id === item.productId);
          if (prod && prod.stock >= item.quantity) {
            prod.stock -= item.quantity;
          }
        });

        saveDatabase(db);

        return sendJson(res, 201, {
          message: '¡Pedido realizado exitosamente!',
          order: newOrder
        });
      } catch (err) {
        console.error('Error creating order:', err);
        return sendJson(res, 500, { error: 'Error al procesar el pedido.' });
      }
    }

    // 7. GET MY ORDERS: GET /api/orders
    if (pathname === '/api/orders' && req.method === 'GET') {
      const auth = getAuthUser(req);
      if (!auth) {
        return sendJson(res, 401, { error: 'Inicia sesión para ver tus pedidos.' });
      }

      const userOrders = db.orders.filter(o => o.userId === auth.id);
      return sendJson(res, 200, { orders: userOrders });
    }

    // 8. TRACK ORDER: GET /api/orders/track/:trackingNumber
    if (pathname.startsWith('/api/orders/track/') && req.method === 'GET') {
      const trackingNumber = pathname.replace('/api/orders/track/', '').trim().toUpperCase();
      const order = db.orders.find(o => o.trackingNumber.toUpperCase() === trackingNumber || o.id.toUpperCase() === trackingNumber);

      if (!order) {
        return sendJson(res, 404, {
          error: `No se encontró ningún pedido con el número "${trackingNumber}". Verifica el código e intenta nuevamente.`
        });
      }

      // Calculate step progression index
      const currentStepIndex = ORDER_STEPS.findIndex(s => s.key === order.status);

      return sendJson(res, 200, {
        order,
        steps: ORDER_STEPS,
        currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0
      });
    }

    // 9. ADVANCE / UPDATE STATUS (For interactive testing & tracking demo): PATCH /api/orders/:trackingNumber/status
    if (pathname.match(/^\/api\/orders\/[^\/]+\/status$/) && req.method === 'PATCH') {
      try {
        const match = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
        const trackingNumber = match[1].toUpperCase();
        const body = await parseRequestBody(req);
        const { status } = body;

        const order = db.orders.find(o => o.trackingNumber.toUpperCase() === trackingNumber || o.id.toUpperCase() === trackingNumber);
        if (!order) {
          return sendJson(res, 404, { error: 'Pedido no encontrado.' });
        }

        const validStatuses = ORDER_STEPS.map(s => s.key);
        let nextStatus = status;

        if (!nextStatus) {
          // If no specific status passed, advance to the next step automatically
          const currentIndex = validStatuses.indexOf(order.status);
          if (currentIndex < validStatuses.length - 1) {
            nextStatus = validStatuses[currentIndex + 1];
          } else {
            nextStatus = validStatuses[0]; // loop back or stay
          }
        }

        const descriptions = {
          'Recibido': 'Pedido recibido y registrado en la base de datos.',
          'En preparación': 'Tus prendas están siendo seleccionadas y empacadas en el centro logístico.',
          'Enviado': 'El paquete ha salido del centro logístico en camión de ruta nacional.',
          'En reparto': 'El mensajero local tiene tu paquete y está en camino a tu dirección.',
          'Entregado': 'Paquete entregado a satisfacción en la dirección de entrega.'
        };

        order.status = nextStatus;
        order.history.push({
          status: nextStatus,
          title: `Estado actualizado a: ${nextStatus}`,
          description: descriptions[nextStatus] || 'Actualización de estado en ruta.',
          timestamp: new Date().toISOString()
        });

        saveDatabase(db);

        const currentStepIndex = ORDER_STEPS.findIndex(s => s.key === order.status);
        return sendJson(res, 200, {
          message: `Estado actualizado a ${nextStatus}`,
          order,
          currentStepIndex
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Error al actualizar estado.' });
      }
    }

    // 10. SYSTEM STATUS / HEALTH CHECK
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        uptime: process.uptime(),
        productsCount: db.products.length,
        ordersCount: db.orders.length,
        usersCount: db.users.length,
        timestamp: new Date().toISOString()
      });
    }

    return sendJson(res, 404, { error: 'Ruta de API no encontrada.' });
  }

  // ---------------- STATIC FILES ----------------
  serveStatic(req, res, pathname);
});

// Initialize DB and start listening
initDatabase();
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛍️  Tienda de Ropa en Línea funcionando exitosamente`);
  console.log(`🌐  Servidor disponible en: http://localhost:${PORT}`);
  console.log(`📦  Catálogo, Carrito, Pagos y Rastreo de Pedidos Activos`);
  console.log(`=======================================================`);
});
