require('dotenv').config();
const initDb = require('./src/config/initDb');
initDb().then(() => { console.log('initDb done'); process.exit(0); }).catch((err) => { console.error('initDb failed', err); process.exit(1); });
