// src/routes/pedidos.routes.js
import { Router } from 'express';
import {
  crearPedido,
  listarPedidos
} from '../controllers/pedidos.controller.js';

import { pdfPreviewPedido, pdfPedidoById } from '../controllers/pedidosPdf.controller.js';
import { supabase } from '../config/supabase.js';

const router = Router();

// ✅ PDF: genera el PDF con lo que hay en el form (sin guardar)
router.post('/pdf/preview', pdfPreviewPedido);

// ✅ PDF OFICIAL (ya guardado)
router.get('/pdf/:id', pdfPedidoById);;

// POST /pedidos  → crear pedido (empleado)
router.post('/', crearPedido);

// GET /pedidos   → listar pedidos (admin / API)
router.get('/', listarPedidos);

// GET /pedidos/next-folio  -> GLOBAL (preview)
router.get('/next-folio', async (req, res) => {
  try {
    const { data: ultimo, error } = await supabase
      .from('pedidos')
      .select('folio_num')
      .not('folio_num', 'is', null)
      .order('folio_num', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo último folio:', error);
      return res.status(500).json({ error: 'Error al obtener folio' });
    }

    const nextFolio = (ultimo?.folio_num || 0) + 1;
    return res.json({ nextFolio });
  } catch (err) {
    console.error('Error inesperado en /pedidos/next-folio:', err);
    return res.status(500).json({ error: 'Error inesperado' });
  }
});

export default router;
