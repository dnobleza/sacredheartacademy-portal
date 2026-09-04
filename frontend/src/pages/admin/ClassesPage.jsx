import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function ClassesPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.classes} />;
}

export default ClassesPage;
