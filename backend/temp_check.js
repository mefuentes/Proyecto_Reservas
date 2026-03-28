require('dotenv').config();
const db=require('./src/config/db');
const bcrypt=require('bcrypt');

db.get('SELECT id, email, password_hash, activo FROM usuarios_admin WHERE email = ?', ['admin@clubpadel.com'], (err, row) => {
  if (err) {
    console.error('DB error', err);
    process.exit(1);
  }
  if (!row) {
    console.log('Admin not found');
    process.exit(0);
  }
  console.log('Admin row:', row);
  const password='admin123';
  bcrypt.compare(password, row.password_hash, (err2, same) => {
    if (err2) {
      console.error('bcrypt error', err2);
      process.exit(1);
    }
    console.log('bcrypt compare admin123 result', same);
    process.exit(0);
  });
});
