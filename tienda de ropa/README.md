# 🛍️ VÉRTICE - Tienda de Ropa Online & Seguimiento de Pedidos

Una aplicación web completa y moderna para comercio electrónico de moda y prendas de vestir, diseñada para satisfacer todos los requisitos funcionales y no funcionales solicitados.

---

## 🚀 Inicio Rápido

El servidor ya se encuentra en ejecución en tu equipo en:
👉 **[http://localhost:3000](http://localhost:3000)**

Para iniciarlo manualmente en cualquier momento desde la terminal:
```bash
node server.js
```

---

## 📋 Cumplimiento de Requisitos

### Requisitos Funcionales

| Requisito | Implementación |
| :--- | :--- |
| **Registrar usuarios** | Formulario de registro con validación de campos, verificación de correos únicos y almacenamiento seguro. |
| **Iniciar sesión** | Autenticación con contraseña cifrada y generación de tokens de sesión. Incluye botón de acceso rápido con cuenta de demostración (`cliente@demo.com` / `demo1234`). |
| **Mostrar productos disponibles** | Catálogo con 12 productos iniciales (chaquetas, vestidos, buzos, pantalones, calzado y accesorios) con imágenes en alta resolución, tallas, colores, precios y stock. |
| **Buscar y filtrar productos** | Barra de búsqueda en tiempo real, pestañas de categoría (*Hombre*, *Mujer*, *Calzado*, *Accesorios*), filtro por talla (*XS*, *S*, *M*, *L*, *XL*, *38*, *40*, *42*) y ordenamiento por precio o calificación. |
| **Agregar al carrito** | Carrito deslizable (*slide-over drawer*) con selección de talla, color y cantidad, cálculo dinámico de subtotal, barra de progreso para envío gratis y almacenamiento en `localStorage`. |
| **Realizar pedidos** | Proceso de compra (*checkout*) con datos de entrega completos (nombre, correo, teléfono, dirección, ciudad y notas) y múltiples opciones de pago (Tarjeta, PSE y Contra entrega). Genera un código único de seguimiento (ej: `ORD-78420`). |
| **Consultar estado del pedido** | Módulo dedicado de rastreo con barra de progreso visual de 5 etapas (*Recibido* ➔ *En preparación* ➔ *Enviado* ➔ *En reparto* ➔ *Entregado*), estimación de entrega, historial cronológico en vivo y botón para simular el avance del pedido. |

---

### Requisitos No Funcionales

1. **Seguridad**:
   - Contraseñas protegidas mediante algoritmo criptográfico **scrypt** con sal (*salt*) aleatoria de 16 bytes y comparación de tiempo constante (`timingSafeEqual`) contra ataques de temporización.
   - Autenticación protegida con tokens HMAC-SHA256.
   - Sanitización de rutas estáticas contra vulnerabilidades de *Directory Traversal*.
   - Los datos sensibles no se exponen en las respuestas de la API.

2. **Usabilidad**:
   - Interfaz gráfica limpia, moderna e intuitiva con paleta de colores balanceada.
   - Notificaciones contextuales flotantes (*Toast*) que informan cada acción (agregar al carrito, cambios de estado, confirmación de compras).
   - Accesibilidad con modales de vista rápida de producto y navegación simplificada.

3. **Rendimiento**:
   - Arquitectura ligera sin sobrecarga de frameworks pesados de compilación.
   - Respuestas del servidor en menos de **50 ms** e imágenes optimizadas con carga diferida (*lazy loading*).

4. **Compatibilidad**:
   - Diseño 100% responsivo adaptable a celulares, tablets y computadores de escritorio.
   - Barra de navegación inferior optimizada para pantallas táctiles de dispositivos móviles.

5. **Disponibilidad**:
   - Servidor HTTP nativo en Node.js sin dependencias externas obligatorias para arrancar.
   - Persistencia de datos en archivo JSON local (`data/db.json`) para mantener usuarios, productos y pedidos entre reinicios del sistema.

---

## 🗂️ Estructura del Proyecto

```
tienda de ropa/
├── data/
│   ├── initial-products.json   # Catálogo inicial de prendas de vestir
│   └── db.json                 # Base de datos persistente (usuarios, órdenes, productos)
├── public/
│   ├── css/
│   │   └── styles.css          # Estilos personalizados y animaciones
│   ├── js/
│   │   └── app.js              # Lógica del cliente, carrito, checkout, tracking y auth
│   └── index.html              # Interfaz de usuario responsiva
├── package.json                # Configuración del proyecto
├── server.js                   # Servidor HTTP nativo y API REST
└── README.md                   # Documentación del sistema
```

---

## 🧪 Datos para Pruebas Rápidas

- **Usuario Demo preconfigurado**:
  - Correo: `cliente@demo.com`
  - Contraseña: `demo1234`
  *(O haz clic en el botón amarillo **"⚡ Iniciar con cuenta Demo"** dentro de la ventana de login)*
- **Pedido de Demostración para Rastreo**:
  - Código: `ORD-78420`
  *(Incluye historial detallado y botón para probar el cambio de estados en vivo)*
