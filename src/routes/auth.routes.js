// src/routes/auth.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

// 🔁 Si ya está logueado, mandarlo a su vista en vez de mostrar el login
function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    const role = req.session.user.role;

    if (role === 'admin') {
      return res.redirect('/admin');
    }

    // Por defecto, empleado
    return res.redirect('/empleado/pedidos/nuevo');
  }
  next();
}

// =============================
//   GET /auth/login
// =============================
router.get('/login', redirectIfAuthenticated, (req, res) => {
  const { error, expired } = req.query;

  res.render('auth/login', {
    title: 'Login - Quality',
    error: error === '1',
    expired: expired === '1',
  });
});

// =============================
//   POST /auth/login
//   ✅ login por "usuario" (sin pedir correo)
// =============================
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    // 1) Validaciones rápidas
    if (!usuario || !password) {
      return res.redirect('/auth/login?error=1');
    }

    const u = String(usuario).trim().toLowerCase();

    // 2) Convertimos "usuario" a email real de Supabase
    //    - admin: deja el gmail
    //    - empleados: e_${usuario}@quality.com
    let email;

    if (u === 'admin') {
      email = 'quality.dev.pedidos@gmail.com';
    } else {
      // ejemplo: "tampiquito11" => "e_tampiquito11@quality.com"
      email = `e_${u}@quality.com`;
    }

    // 3) Login supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error('Error en login supabase:', error);
      return res.redirect('/auth/login?error=1');
    }

    const user = data.user;

    console.log('=== DEBUG LOGIN SUPABASE ===');
    console.log('Usuario ingresado:', u);
    console.log('Email usado:', user.email);

    // 4) Rol según correo
    let role = 'empleado';
    if (user.email === 'quality.dev.pedidos@gmail.com') {
      role = 'admin';
    }

    // 5) Guardar sesión
    req.session.user = {
      id: user.id,
      email: user.email,
      role,
      username: u, // 🔥 útil para mostrarlo en UI si quieres
    };

    console.log('=== SESSION USER DESPUÉS DE LOGIN ===');
    console.log(req.session.user);

    // 6) Redirección por rol
    if (role === 'admin') {
      return res.redirect('/admin');
    }

    return res.redirect('/empleado/pedidos/nuevo');
  } catch (err) {
    console.error('Error inesperado en /auth/login:', err);
    return res.redirect('/auth/login?error=1');
  }
});

// =============================
//   GET /auth/logout
// =============================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    // Evitar usar caché después de cerrar sesión
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.redirect('/auth/login');
  });
});

export default router; // 👈 IMPORTANTE
