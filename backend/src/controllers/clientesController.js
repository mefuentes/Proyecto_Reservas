const { normalizarDocumento, getClientePorDocumento, listarClientes, actualizarCliente, crearCliente, eliminarCliente } = require('../services/clientesService');

const obtenerClientePorDocumento = async (req, res) => {
  try {
    const documento = normalizarDocumento(req.params.documento);
    if (!documento) return res.status(400).json({ ok: false, message: 'Documento invalido' });
    const cliente = await getClientePorDocumento(documento);
    return res.json({ ok: true, data: cliente });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al buscar cliente' });
  }
};

const listarClientesAdmin = async (req, res) => {
  try {
    const result = await listarClientes({
      q: req.query.q || '',
      page: req.query.page || 1,
      pageSize: req.query.page_size || 10
    });
    return res.json({
      ok: true,
      data: result.rows,
      pagination: {
        total: result.total,
        page: result.page,
        page_size: result.pageSize,
        total_pages: Math.max(Math.ceil(result.total / result.pageSize), 1)
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al listar clientes' });
  }
};

const crearClienteAdmin = async (req, res) => {
  try {
    const { documento, nombre_apellido, telefono } = req.body || {};
    const doc = normalizarDocumento(documento);
    if (!doc) return res.status(400).json({ ok: false, message: 'Documento invalido' });
    if (!nombre_apellido || !String(nombre_apellido).trim()) {
      return res.status(400).json({ ok: false, message: 'El nombre y apellido es obligatorio' });
    }
    const cliente = await crearCliente({ documento: doc, nombre_apellido, telefono });
    return res.status(201).json({ ok: true, message: 'Cliente creado correctamente', data: cliente });
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('ya existe')) {
      return res.status(409).json({ ok: false, message: 'Ya existe un cliente con ese documento' });
    }
    return res.status(500).json({ ok: false, message: 'Error al crear cliente' });
  }
};

const actualizarClienteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_apellido, telefono } = req.body;
    if (!nombre_apellido || !String(nombre_apellido).trim()) {
      return res.status(400).json({ ok: false, message: 'El nombre y apellido es obligatorio' });
    }
    const ok = await actualizarCliente(id, { nombre_apellido, telefono });
    if (!ok) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    return res.json({ ok: true, message: 'Cliente actualizado correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al actualizar cliente' });
  }
};

const eliminarClienteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await eliminarCliente(id);
    if (!ok) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    return res.json({ ok: true, message: 'Cliente eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al eliminar cliente' });
  }
};

module.exports = { obtenerClientePorDocumento, listarClientesAdmin, crearClienteAdmin, actualizarClienteAdmin, eliminarClienteAdmin };
