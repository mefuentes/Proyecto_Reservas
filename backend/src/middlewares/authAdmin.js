const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ ok: false, message: 'Token no enviado' });
    }
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, message: 'Formato de token inválido' });
    }
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'secreto_dev');
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Token inválido o vencido' });
  }
};
