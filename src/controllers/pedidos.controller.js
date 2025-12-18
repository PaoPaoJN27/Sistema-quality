// src/controllers/pedidos.controller.js
import {
  crearPedidoService,
  listarPedidosService
} from '../services/pedidos.service.js';

function isFormRequest(req) {
  const ct = req.headers['content-type'] || '';
  return ct.includes('application/x-www-form-urlencoded');
}

function human(code, extra = '') {
  switch (code) {
    case 'MISSING_FIELDS':
      return extra ? `Faltan campos obligatorios: ${extra}.` : 'Faltan campos obligatorios.';
    case 'INVALID_PHONE':
      return 'Teléfono inválido. Debe tener 10 dígitos.';
    case 'INVALID_TOTALS':
      return 'Totales inválidos. Revisa Total y Anticipo.';
    case 'INVALID_ITEMS_JSON':
      return 'Las partidas del pedido tienen un formato inválido. Vuelve a intentar.';
    case 'EMPTY_ITEMS':
      return 'Agrega al menos una partida válida (cantidad, descripción y total).';
    case 'DB_ERROR':
      return 'No se pudo guardar el pedido. Intenta de nuevo.';
    default:
      return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}

// ✅ nombres bonitos para el error de campos faltantes
const nombresBonitos = {
  nombre_cliente: 'Nombre del cliente',
  telefono_cliente: 'Teléfono del cliente',
  descripcion_pedido: 'Partidas del pedido',
  items_json: 'Partidas del pedido',
  sucursal: 'Sucursal',
  fecha_entrega: 'Fecha de entrega',
  total: 'Total',
  anticipo: 'Anticipo',
  encargado: 'Encargado de realizar el trabajo',
  recibe: 'Nombre de quien recibe'
};

function prettyFields(fields = []) {
  return fields.map(f => nombresBonitos[f] || f).join(', ');
}

export async function crearPedido(req, res) {
  try {
    const isForm = isFormRequest(req);

    // ✅ clon seguro
    const datos = { ...req.body };

    // ❌ Campos SOLO de UI (NO BD)
    delete datos.folio_preview;
    delete datos.resto_preview;
    delete datos.folio_num;
    delete datos.folio_text;

    // =========================
    // VALIDACIÓN BASE
    // =========================
    const camposObligatorios = [
      'nombre_cliente',
      'telefono_cliente',
      'descripcion_pedido', // compatibilidad (hidden)
      'items_json',         // ✅ payload real (hidden)
      'sucursal',
      'fecha_entrega',
      'total',
      'anticipo',
      'encargado',
      'recibe'              // ✅ NUEVO obligatorio
    ];

    const faltantes = [];

    for (const campo of camposObligatorios) {
      const valor = datos[campo];
      if (valor === undefined || valor === null || String(valor).trim() === '') {
        faltantes.push(campo);
      }
    }

    if (faltantes.length > 0) {
      const code = 'MISSING_FIELDS';
      const msg = human(code, prettyFields(faltantes));

      if (isForm) {
        return res.redirect(`/empleado/pedidos/nuevo?error=${code}&msg=${encodeURIComponent(msg)}`);
      }

      return res.status(400).json({ ok: false, code, message: msg });
    }

    // =========================
    // TELÉFONO (10 dígitos)
    // =========================
    const telefono = String(datos.telefono_cliente).replace(/\D/g, '');

    if (telefono.length !== 10) {
      const code = 'INVALID_PHONE';
      const msg = human(code);

      if (isForm) {
        return res.redirect(`/empleado/pedidos/nuevo?error=${code}&msg=${encodeURIComponent(msg)}`);
      }

      return res.status(400).json({ ok: false, code, message: msg });
    }

    datos.telefono_cliente = telefono;

    // =========================
    // TOTALES (consistentes)
    // =========================
    const total = datos.total === '' || datos.total == null ? NaN : Number(datos.total);
    const anticipo = datos.anticipo === '' || datos.anticipo == null ? NaN : Number(datos.anticipo);

    if (
      Number.isNaN(total) ||
      Number.isNaN(anticipo) ||
      total < 0 ||
      anticipo < 0 ||
      anticipo > total
    ) {
      const code = 'INVALID_TOTALS';
      const msg = human(code);

      if (isForm) {
        return res.redirect(`/empleado/pedidos/nuevo?error=${code}&msg=${encodeURIComponent(msg)}`);
      }

      return res.status(400).json({ ok: false, code, message: msg });
    }

    // =========================
    // CREAR PEDIDO (incluye extras + items_json)
    // =========================
    const pedido = await crearPedidoService(datos, req.session.user);

    if (isForm) {
      return res.redirect(
        `/empleado/pedidos/nuevo?success=1&folio=${encodeURIComponent(pedido.folio_num)}&pedidoId=${encodeURIComponent(pedido.id)}`
      );
    }

    return res.status(201).json({
      ok: true,
      message: 'Pedido creado correctamente',
      pedido
    });

  } catch (err) {
    console.error('[crearPedido] ERROR:', err);

    const isForm = isFormRequest(req);

    // ✅ respetar códigos del service
    const serviceCodes = new Set([
      'INVALID_TOTALS',
      'INVALID_ITEMS_JSON',
      'EMPTY_ITEMS'
    ]);

    const code = serviceCodes.has(err?.message) ? err.message : 'DB_ERROR';
    const msg = human(code);

    if (isForm) {
      return res.redirect(`/empleado/pedidos/nuevo?error=${code}&msg=${encodeURIComponent(msg)}`);
    }

    // si es un error de validación del service, devuelvo 400; si no, 500
    const status = serviceCodes.has(err?.message) ? 400 : 500;
    return res.status(status).json({ ok: false, code, message: msg });
  }
}

export async function listarPedidos(req, res) {
  try {
    const pedidos = await listarPedidosService();
    return res.json(pedidos);
  } catch (err) {
    console.error('[listarPedidos] ERROR:', err);
    return res.status(500).json({
      message: 'Error al listar pedidos',
      error: err.message
    });
  }
}
