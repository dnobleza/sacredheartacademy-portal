import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function AdminsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.admins} />;
}

export default AdminsPage;
