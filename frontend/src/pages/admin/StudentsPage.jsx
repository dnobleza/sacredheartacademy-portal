import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function StudentsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.students} />;
}

export default StudentsPage;
