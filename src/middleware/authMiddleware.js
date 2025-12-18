// src/middleware/authMiddleware.js

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    // Si NO hay sesión: aseguramos que la página no se cachee
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Mandamos al login con bandera de expirado
    return res.redirect('/auth/login?expired=1');
  }

  // Si SÍ hay sesión y estamos en una ruta protegida,
  // también evitamos que el navegador la guarde en caché.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  next();
}
