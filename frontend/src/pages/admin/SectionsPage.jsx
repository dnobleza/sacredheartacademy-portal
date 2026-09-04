import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function SectionsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.sections} />;
}

export default SectionsPage;
