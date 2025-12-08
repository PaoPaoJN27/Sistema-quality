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
    expired: expired === '1',   // 👈 pasamos esta bandera a la vista
  });
});

// =============================
//   POST /auth/login
// =============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error('Error en login supabase:', error);
      return res.redirect('/auth/login?error=1');
    }

    const user = data.user;

    let role = 'empleado';
    if (user.user_metadata && user.user_metadata.role) {
      role = user.user_metadata.role;
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role,
    };

    if (role === 'admin') {
      return res.redirect('/admin');
    }

    return res.redirect('/empleado/pedidos/nuevo');
  } catch (err) {
    console.error(err);
    return res.redirect('/auth/login?error=1');
  }
});

// =============================
//   GET /auth/logout
// =============================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

export default router;
