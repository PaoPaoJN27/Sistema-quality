// src/controllers/pedidos.controller.js
import {
  crearPedidoService,
  listarPedidosService
} from '../services/pedidos.service.js';

export async function crearPedido(req, res) {
  try {
    const datos = req.body;

    const camposObligatorios = [
      'nombre_cliente',
      'telefono_cliente',
      'descripcion_pedido',
      'sucursal',
      'fecha_entrega'
    ];

    for (const campo of camposObligatorios) {
      if (!datos[campo]) {
        // Si viene de un formulario HTML → redirige con error
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
          return res.redirect('/empleado/pedidos/nuevo?error=1');
        }

        // Si viene de API JSON → responde JSON
        return res.status(400).json({ message: `Falta el campo: ${campo}` });
      }
    }

    const pedido = await crearPedidoService(datos);

    // ============================
    // 🔹 Si la solicitud viene del formulario del empleado:
    // ============================
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      return res.redirect('/empleado/pedidos/nuevo?success=1');
    }

    // ============================
    // 🔹 Si viene de Postman / Thunder / fetch JSON:
    // ============================
    return res.status(201).json({
      message: 'Pedido creado correctamente',
      pedido
    });

  } catch (err) {
    console.error(err);

    // Si viene desde un formulario
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      return res.redirect('/empleado/pedidos/nuevo?error=1');
    }

    // Si viene de la API
    return res
      .status(500)
      .json({ message: 'Error al crear pedido', error: err.message });
  }
}

export async function listarPedidos(req, res) {
  try {
    const pedidos = await listarPedidosService();
    return res.json(pedidos);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Error al listar pedidos', error: err.message });
  }
}
