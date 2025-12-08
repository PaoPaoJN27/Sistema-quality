import { Router } from 'express';
const router = Router();

// cambiar estado de un pedido
router.patch('/:id/estado', (req, res) => {
  res.json({ message: 'Actualizar estado pendiente de implementar' });
});

export default router;
