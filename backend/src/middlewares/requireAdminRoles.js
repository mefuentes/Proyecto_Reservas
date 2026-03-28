module.exports = function requireAdminRoles(...allowedRoles) {
  const roles = allowedRoles.flat().filter(Boolean);

  return (req, res, next) => {
    const currentRole = req.admin?.rol;
    if (!currentRole) {
      return res.status(401).json({ ok: false, message: 'Sesion invalida' });
    }
    if (!roles.includes(currentRole)) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para realizar esta accion' });
    }
    next();
  };
};
