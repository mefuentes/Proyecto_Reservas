import AdminMenu from './AdminMenu';

export default function AdminLayout({ title, children }) {
  return (
    <div className="admin-layout">
      <AdminMenu />
      <main className="admin-main">
        <div className="admin-page-header"><h1>{title}</h1></div>
        {children}
      </main>
    </div>
  );
}
