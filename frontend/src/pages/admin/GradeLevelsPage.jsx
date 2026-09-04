import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function GradeLevelsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES['grade-levels']} />;
}

export default GradeLevelsPage;
