export function getAdminUser() {
  try {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAdminRole() {
  const role = getAdminUser()?.rol || '';
  if (role === 'admin' || role === 'gerente') return 'gerencial';
  return role;
}

export function hasAdminRole(...allowedRoles) {
  const role = getAdminRole();
  return Boolean(role) && allowedRoles.includes(role);
}
