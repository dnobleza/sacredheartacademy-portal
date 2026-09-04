import PortalLayout from './PortalLayout';
import { ADMIN_NAV } from '../data/adminResources';

function AdminLayout() {
  return <PortalLayout nav={ADMIN_NAV} storageKey="admin.sidebar.collapsed" portalLabel="Admin" />;
}

export default AdminLayout;
