// src/middleware/roleMiddleware.js

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');

    if (req.session.user.role !== role) {
      // Redirigir a su panel correcto
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
