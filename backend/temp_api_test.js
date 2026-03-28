const fetch = global.fetch || require('node-fetch');

(async () => {
  try {
    const login = await fetch('http://localhost:3000/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@clubpadel.com', password: 'admin123' })
    });
    console.log('login status', login.status);
    const loginData = await login.text();
    console.log('login body', loginData);
  } catch (err) {
    console.error('error', err);
  }
})();
