// src/services/pedidos.service.js
import { supabase } from '../config/supabase.js';

function toBool(v) {
  return v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
}

function cleanText(v) {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

function parseMoney(v) {
  const raw = String(v ?? '').trim();
  if (raw === '') return null;

  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;

  return Math.round(n * 100) / 100;
}

// ✅ items_json debe ser array (jsonb)
// - Si viene como string: intenta JSON.parse
// - Si viene como array: lo deja
// - Si viene vacío/null: []
// - Si viene inválido: null
function parseItemsJson(v) {
  if (v == null) return [];

  if (Array.isArray(v)) return v;

  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return [];
    try {
      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

function sanitizeItemDesc(desc) {
  let s = String(desc ?? '').trim();

  // Quita "1) " al inicio
  s = s.replace(/^\s*\d+\)\s*/g, '');

  // Quita "(1) " al inicio (si alguien lo mete)
  s = s.replace(/^\(\s*\d+\s*\)\s*/g, '');

  // Quita "— $850.00" / "- 850" / "—850" al final
  s = s.replace(/\s*[—-]\s*\$?\s*[\d.,]+\s*$/g, '');

  // Colapsa espacios
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Crear pedido (módulo empleado)
 * folio_num lo asigna la BD (sequence). NO se calcula aquí.
 *
 * ✅ Opción A:
 * - NO mandar fecha_pedido desde Node
 * - Dejar que la BD ponga el default (ya configurado en Supabase con timezone MX)
 */
export async function crearPedidoService(datos, usuarioSesion) {
  console.log('=== CREAR PEDIDO SERVICE ===');
  console.log('Datos recibidos:', datos);
  console.log('Usuario sesión:', usuarioSesion);

  const {
    nombre_cliente,
    telefono_cliente,
    descripcion_pedido,

    // ✅ NUEVO
    items_json,

    sucursal,
    fecha_entrega,
    requiere_factura,
    total,
    anticipo,
    encargado,
    recibe,

    // ✅ extras nuevos
    toggleExtra,
    trabajo_impreso,
    trabajo_entregado,
    observaciones,
    archivo_carpeta,
    archivo_nombre,
    archivo_computadora,
  } = datos;

  // ✅ ya es seguro loggear recibe aquí (después del destructuring)
  const recibeTxt = cleanText(recibe);
  console.log('recibe (service) raw:', recibe);
  console.log('recibe (service) cleaned:', recibeTxt);

  // ================================
  // 0) Parse + limpiar items_json (1 sola vez)
  // ================================
  const parsedItems = parseItemsJson(items_json);
  if (parsedItems === null) {
    throw new Error('INVALID_ITEMS_JSON');
  }

  const itemsArr = (parsedItems || [])
    .filter(
      (i) =>
        i &&
        Number.isFinite(Number(i.cantidad)) &&
        Number(i.cantidad) > 0 &&
        String(i.descripcion || '').trim() !== '' &&
        Number.isFinite(Number(i.total)) &&
        Number(i.total) >= 0,
    )
    .map((i) => ({
      cantidad: Number(i.cantidad),
      // ✅ aquí se limpia el "1)" y el "(1)" y el "— $..."
      descripcion: sanitizeItemDesc(i.descripcion),
      total: Math.round(Number(i.total) * 100) / 100,
    }));

  // ✅ obligar a que exista al menos 1 partida válida
  if (itemsArr.length === 0) {
    throw new Error('EMPTY_ITEMS');
  }

  // ================================
  // 1) Calcular montos (BLINDADO)
  // ================================
  const totalNum = parseMoney(total);
  const anticipoNum = parseMoney(anticipo);

  if (totalNum === null || anticipoNum === null) {
    throw new Error('INVALID_TOTALS');
  }

  if (anticipoNum > totalNum) {
    throw new Error('INVALID_TOTALS');
  }

  const restoNum = Math.round((totalNum - anticipoNum) * 100) / 100;

  // ================================
  // 2) Convertir factura a boolean
  // ================================
  const requiereFacturaBool = requiere_factura === 'si';

  // ================================
  // 3) Extras: solo si activan toggle
  // ================================
  const extraOn = toBool(toggleExtra);

  const trabajoImpresoBool = extraOn ? toBool(trabajo_impreso) : false;
  const trabajoEntregadoBool = extraOn ? toBool(trabajo_entregado) : false;

  const observacionesTxt = extraOn ? cleanText(observaciones) : null;
  const carpetaTxt = extraOn ? cleanText(archivo_carpeta) : null;
  const nombreTxt = extraOn ? cleanText(archivo_nombre) : null;
  const pcTxt = extraOn ? cleanText(archivo_computadora) : null;

  // ================================
  // 4) Insertar pedido
  // ================================
  const payload = {
    nombre_cliente: cleanText(nombre_cliente),
    telefono_cliente: cleanText(telefono_cliente),
    descripcion_pedido: cleanText(descripcion_pedido),

    sucursal: cleanText(sucursal),

    // ✅ Opción A: NO mandar fecha_pedido
    // La BD la asigna con el DEFAULT (timezone MX ya configurado).
    fecha_entrega,
    estado: 'No iniciado',

    total: totalNum,
    anticipo: anticipoNum,
    resto: restoNum,

    requiere_factura: requiereFacturaBool,
    encargado: cleanText(encargado),

    // ✅ recibe (opcional)
    recibe: recibeTxt,

    // ✅ extras
    trabajo_impreso: trabajoImpresoBool,
    trabajo_entregado: trabajoEntregadoBool,
    observaciones: observacionesTxt,
    archivo_carpeta: carpetaTxt,
    archivo_nombre: nombreTxt,
    archivo_computadora: pcTxt,

    // ✅ items (jsonb)
    items_json: itemsArr,
  };

  console.log('Payload a insertar en pedidos:', payload);

  const { data, error } = await supabase
    .from('pedidos')
    .insert([payload])
    .select('*')
    .single();

  if (error) {
    console.error('Error al crear pedido:', error);
    throw error;
  }

  console.log('Pedido creado en BD:', data);
  return data;
}

/**
 * Listar todos los pedidos (para administrador)
 */
export async function listarPedidosService() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('folio_num', { ascending: false });

  if (error) {
    console.error('Error al listar pedidos:', error);
    throw error;
  }

  return data;
}

/**
 * Actualizar el estado de un pedido
 */
export async function actualizarEstadoPedidoService(id, nuevoEstado) {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar estado del pedido:', error);
    throw error;
  }

  return data;
}
