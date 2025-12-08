// src/routes/pedidos.routes.js
import { Router } from 'express';
import {
  crearPedido,
  listarPedidos
} from '../controllers/pedidos.controller.js';

const router = Router();

// POST /pedidos  → crear pedido (empleado)
router.post('/', crearPedido);

// GET /pedidos   → listar pedidos (admin)
router.get('/', listarPedidos);

export default router;
