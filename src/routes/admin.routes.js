// src/routes/admin.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

/**
 * GET /admin
 * Panel del administrador: lista de pedidos "activos"
 * - Por defecto NO muestra "Terminado"
 * - Filtros: sucursal, estado, fechas, búsqueda
 * - Búsqueda: SOLO por folio (folio_num) y exacta
 */
router.get('/', async (req, res) => {
  try {
    const {
      f_sucursal = '',
      f_estado = '',
      f_desde = '',
      f_hasta = '',
      f_q = '',
      f_limit = '10',
      page = '1',
    } = req.query;

    const pageSize = parseInt(f_limit, 10) || 10;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('pedidos')
      .select('*', { count: 'exact' })
      .order('folio_num', { ascending: false });

    // ====== Filtro por sucursal ======
    if (f_sucursal && f_sucursal !== 'Todas') {
      query = query.eq('sucursal', f_sucursal);
    }

    // ====== Filtro por estado ======
    if (f_estado && f_estado !== 'Todos') {
      query = query.eq('estado', f_estado);
    } else {
      // Por defecto no mostrar Terminado
      query = query.neq('estado', 'Terminado');
    }

    // ====== Filtro por fechas (solo fecha_pedido) ======
    if (f_desde) query = query.gte('fecha_pedido', f_desde);
    if (f_hasta) query = query.lte('fecha_pedido', f_hasta);

    // ====== BÚSQUEDA: SOLO folio exacto ======
    if (f_q.trim() !== '') {
      const term = f_q.trim();

      // Solo permitir números (folio_num)
      const folioExacto = parseInt(term, 10);

      if (!Number.isNaN(folioExacto)) {
        query = query.eq('folio_num', folioExacto);
      } else {
        // Si no es número, no aplicamos búsqueda (para que no confunda)
        // Opcional: podrías devolver 0 resultados a propósito, si prefieres:
        // query = query.eq('folio_num', -1);
      }
    }

    // ====== Paginación ======
    query = query.range(from, to);

    const { data: pedidos, error, count } = await query;

    if (error) {
      console.error('Error cargando pedidos para admin:', error);
      return res.render('admin/pedidos-lista', {
        title: 'Panel administrador',
        pedidos: [],
        filtros: { f_sucursal, f_estado, f_desde, f_hasta, f_q, f_limit },
        error: 'No se pudieron cargar los pedidos.',
        page: currentPage,
        pageSize,
        total: 0,
        totalPages: 1,
      });
    }

    const total = count || 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    return res.render('admin/pedidos-lista', {
      title: 'Panel administrador',
      pedidos,
      filtros: { f_sucursal, f_estado, f_desde, f_hasta, f_q, f_limit },
      error: null,
      page: currentPage,
      pageSize,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('Error inesperado en /admin:', err);
    return res.render('admin/pedidos-lista', {
      title: 'Panel administrador',
      pedidos: [],
      filtros: {},
      error: 'Ocurrió un error inesperado.',
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
  }
});

/**
 * GET /admin/historial
 * Muestra SOLO pedidos entregados
 * - Búsqueda: SOLO por folio (folio_num) y exacta
 */
router.get('/historial', async (req, res) => {
  try {
    const {
      f_sucursal = '',
      f_desde = '',
      f_hasta = '',
      f_q = '',
      f_limit = '10',
      page = '1',
    } = req.query;

    const pageSize = parseInt(f_limit, 10) || 10;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('pedidos')
      .select('*', { count: 'exact' })
      .eq('estado', 'Terminado')
      .order('folio_num', { ascending: false });

    // ====== Filtro por sucursal ======
    if (f_sucursal && f_sucursal !== 'Todas') {
      query = query.eq('sucursal', f_sucursal);
    }

    // ====== Filtro por fechas (solo fecha_pedido) ======
    if (f_desde) query = query.gte('fecha_pedido', f_desde);
    if (f_hasta) query = query.lte('fecha_pedido', f_hasta);

    // ====== BÚSQUEDA: SOLO folio exacto ======
    if (f_q.trim() !== '') {
      const term = f_q.trim();

      const folioExacto = parseInt(term, 10);

      if (!Number.isNaN(folioExacto)) {
        query = query.eq('folio_num', folioExacto);
      } else {
        // Opcional: forzar 0 resultados:
        // query = query.eq('folio_num', -1);
      }
    }

    // ====== Paginación ======
    query = query.range(from, to);

    const { data: pedidos, error, count } = await query;

    if (error) {
      console.error('Error cargando historial de pedidos:', error);
      return res.render('admin/historial-entregados', {
        title: 'Historial de pedidos entregados',
        pedidos: [],
        filtros: { f_sucursal, f_desde, f_hasta, f_q, f_limit },
        error: 'No se pudo cargar el historial.',
        page: currentPage,
        pageSize,
        total: 0,
        totalPages: 1,
      });
    }

    const total = count || 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    return res.render('admin/historial-entregados', {
      title: 'Historial de pedidos entregados',
      pedidos,
      filtros: { f_sucursal, f_desde, f_hasta, f_q, f_limit },
      error: null,
      page: currentPage,
      pageSize,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('Error inesperado en /admin/historial:', err);
    return res.render('admin/historial-entregados', {
      title: 'Historial de pedidos entregados',
      pedidos: [],
      filtros: {},
      error: 'Ocurrió un error inesperado.',
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
  }
});

/**
 * POST /admin/:id/estado
 * Cambiar estado de un pedido
 */
router.post('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      console.error('Error actualizando estado del pedido:', error);
    }

    return res.redirect('/admin');
  } catch (err) {
    console.error('Error inesperado al actualizar estado:', err);
    return res.redirect('/admin');
  }
});

export default router;
