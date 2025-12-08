// src/services/pedidos.service.js
import { supabase } from '../config/supabase.js';

export async function crearPedidoService(datos) {
  const {
    nombre_cliente,
    telefono_cliente,
    descripcion_pedido,
    sucursal,
    fecha_entrega
  } = datos;

  // Insertamos y dejamos que Supabase ponga:
  // id, fecha_pedido, estado='Pendiente', creado_en
  const { data, error } = await supabase
    .from('pedidos')
    .insert([
      {
        nombre_cliente,
        telefono_cliente,
        descripcion_pedido,
        sucursal,
        fecha_entrega
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error al crear pedido:', error);
    throw error;
  }

  return data;
}

export async function listarPedidosService() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error al listar pedidos:', error);
    throw error;
  }

  return data;
}
