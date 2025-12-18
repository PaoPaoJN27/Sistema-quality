// src/controllers/pedidosPdf.controller.js
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { htmlToPdfBuffer } from '../services/pdf.service.js';
import { supabase } from '../config/supabase.js'; // ✅ IMPORTANTE
import { pdfQueue, pdfQueueStats } from '../queue/pdfQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helper: convierte "100.00" o "100,00" -> 100
function toNumber(v, fallback = 0) {
  if (v == null) return fallback;
  const s = String(v).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

// ✅ helper fecha local (MX) en YYYY-MM-DD (sin desfase por UTC)
function todayLocalISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeItemDesc(desc) {
  let s = String(desc ?? '').trim();
  s = s.replace(/^\s*\d+\)\s*/g, '');
  s = s.replace(/^\(\s*\d+\s*\)\s*/g, '');
  s = s.replace(/\s*[—-]\s*\$?\s*[\d.,]+\s*$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ✅ NUEVO: parsea items_json a arreglo usable por el PDF
function parseItems(items_json) {
  try {
    const arr =
      typeof items_json === 'string'
        ? JSON.parse(items_json)
        : (items_json || []);

    if (!Array.isArray(arr)) return [];

    return arr
      .filter(i =>
        i &&
        String(i.descripcion ?? '').trim() !== '' &&
        Number.isFinite(Number(i.cantidad)) &&
        Number(i.cantidad) > 0 &&
        Number.isFinite(Number(i.total))
      )
      .map(i => ({
        cantidad: Number(i.cantidad),
        descripcion: sanitizeItemDesc(String(i.descripcion).trim()),
        total: Math.round(Number(i.total) * 100) / 100
      }));
  } catch {
    return [];
  }
}

// ✅ YA LO TIENES: preview por body
export async function pdfPreviewPedido(req, res) {
  try {
    const total = toNumber(req.body.total, 0);
    const anticipo = toNumber(req.body.anticipo, 0);

    // ✅ prioridad: resto_preview si trae algo válido; si no, calcula
    const restoPreviewRaw = (req.body.resto_preview ?? '').toString().trim();
    const restoPreviewNum =
      restoPreviewRaw !== '' ? toNumber(restoPreviewRaw, NaN) : NaN;

    const restoCalc = total - anticipo;
    const restoFinal = Number.isFinite(restoPreviewNum) ? restoPreviewNum : restoCalc;

    const fecha_pedido = todayLocalISO();

    const items_json = req.body.items_json || '[]';
    const items = parseItems(items_json);

    const pedido = {
      folio_num: req.body.folio_preview || '',
      nombre_cliente: req.body.nombre_cliente || '',
      telefono_cliente: req.body.telefono_cliente || '',

      // compatibilidad
      descripcion_pedido: req.body.descripcion_pedido || '',
      items_json,

      // ✅ lo que vas a usar en el PDF para tabla
      items,

      sucursal: req.body.sucursal || '',
      fecha_pedido,
      fecha_entrega: req.body.fecha_entrega || '',

      requiere_factura: req.body.requiere_factura === 'si',

      total,
      anticipo,
      resto: restoFinal,

      encargado: req.body.encargado || '',
      recibe: req.body.recibe || '',

      trabajo_impreso: req.body.trabajo_impreso === 'true' || req.body.trabajo_impreso === 'on',
      trabajo_entregado: req.body.trabajo_entregado === 'true' || req.body.trabajo_entregado === 'on',
      observaciones: req.body.observaciones || '',
      archivo_carpeta: req.body.archivo_carpeta || '',
      archivo_nombre: req.body.archivo_nombre || '',
      archivo_computadora: req.body.archivo_computadora || '',

      estado: 'No iniciado',
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/img/quality.png`;

    const templatePath = path.join(__dirname, '../views/pedidos/pedido-pdf.ejs');
    const html = await ejs.renderFile(templatePath, { pedido, logoUrl }, { async: true });

    // ✅ Cola: limita concurrencia para evitar saturación
    const pdfBuffer = await pdfQueue.add(() => htmlToPdfBuffer(html), {
      timeout: Number(process.env.PDF_JOB_TIMEOUT_MS || 60000),
      throwOnTimeout: true,
    });

    // ✅ DEBUG: ver estado de cola desde el navegador (Network → Headers)
    const s = pdfQueueStats();
    res.setHeader('X-PDF-Queue-Pending', String(s.pending));
    res.setHeader('X-PDF-Queue-Size', String(s.size));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="pedido_${pedido.folio_num || 'preview'}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('[pdfPreviewPedido] ERROR:', err);
    return res.status(500).json({ ok: false, message: 'No se pudo generar el PDF' });
  }
}

// ✅ PDF OFICIAL desde BD (folio real)
export async function pdfPedidoById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, message: 'Falta id' });

    const { data: pedidoDb, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !pedidoDb) {
      console.error('[pdfPedidoById] Supabase error:', error);
      return res.status(404).json({ ok: false, message: 'Pedido no encontrado' });
    }

    // ✅ normaliza items
    const items_json = pedidoDb.items_json || '[]';
    const items = parseItems(items_json);

    const pedido = {
      ...pedidoDb,
      items_json,
      items,
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/img/quality.png`;

    const templatePath = path.join(__dirname, '../views/pedidos/pedido-pdf.ejs');
    const html = await ejs.renderFile(templatePath, { pedido, logoUrl }, { async: true });

    // ✅ Cola: limita concurrencia para evitar saturación
    const pdfBuffer = await pdfQueue.add(() => htmlToPdfBuffer(html), {
      timeout: Number(process.env.PDF_JOB_TIMEOUT_MS || 60000),
      throwOnTimeout: true,
    });

    // ✅ DEBUG: ver estado de cola desde el navegador (Network → Headers)
    const s = pdfQueueStats();
    res.setHeader('X-PDF-Queue-Pending', String(s.pending));
    res.setHeader('X-PDF-Queue-Size', String(s.size));

    const download = String(req.query.download || '') === '1';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="pedido_${pedido.folio_num || pedido.id}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('[pdfPedidoById] ERROR:', err);
    return res.status(500).json({ ok: false, message: 'No se pudo generar el PDF oficial' });
  }
}
