// src/middleware/authMiddleware.js

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    // Cuando no hay sesión, mandamos al login con ?expired=1
    return res.redirect('/auth/login?expired=1');
  }
  next();
}
