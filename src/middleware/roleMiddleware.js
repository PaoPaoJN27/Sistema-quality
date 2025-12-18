// src/middleware/roleMiddleware.js

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      // Si no hay sesión, directo al login
      return res.redirect('/auth/login');
    }

    // Si el rol NO coincide, lo mandamos a su panel correcto
    if (req.session.user.role !== role) {
      if (req.session.user.role === 'empleado') {
        return res.redirect('/empleado/pedidos/nuevo');
      }
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin');
      }
      return res.redirect('/auth/login');
    }

    next();
  };
}
