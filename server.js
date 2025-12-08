// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';

import authRoutes from './src/routes/auth.routes.js';
import pedidosRoutes from './src/routes/pedidos.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

// Middlewares de auth / rol
import { requireAuth } from './src/middleware/authMiddleware.js';
import { requireRole } from './src/middleware/roleMiddleware.js';

dotenv.config();

const app = express();

// ====== Middlewares base ======
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // para leer formularios HTML

// ====== Sesiones ======
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'quality-super-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 horas
    },
  })
);

// ====== Desactivar caché del navegador ======
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ====== Configuración de vistas (EJS) ======
const __dirname = process.cwd();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Archivos estáticos (css, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Hacer disponible el usuario logueado en todas las vistas
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ====== Función: si el usuario YA está autenticado, redirigirlo a su panel ======
function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    const role = req.session.user.role;

    if (role === 'admin') {
      return res.redirect('/admin');
    }

    return res.redirect('/empleado/pedidos/nuevo');
  }
  next();
}

// ====== Rutas base API ======
app.use('/auth', authRoutes);

// Rutas que requieren login y rol
app.use('/pedidos', requireAuth, requireRole('empleado'), pedidosRoutes);
app.use('/admin', requireAuth, requireRole('admin'), adminRoutes);

// ====== Rutas de vistas ======

// 👉 Página principal: si ya está logueado, lo manda a su panel
app.get('/', (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;

    if (role === 'admin') {
      return res.redirect('/admin');
    }

    return res.redirect('/empleado/pedidos/nuevo');
  }

  return res.redirect('/auth/login');
});

// Vista del formulario del empleado (protegida)
app.get(
  '/empleado/pedidos/nuevo',
  requireAuth,
  requireRole('empleado'),
  (req, res) => {
    const { success, error } = req.query;

    res.render('empleado/nuevo-pedido', {
      title: 'Nuevo pedido - Empleado',
      success: success === '1',
      error: error === '1',
    });
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
