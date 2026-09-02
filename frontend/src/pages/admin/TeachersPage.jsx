import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function TeachersPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.teachers} />;
}

export default TeachersPage;
