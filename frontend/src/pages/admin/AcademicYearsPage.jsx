import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function AcademicYearsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES['academic-years']} />;
}

export default AcademicYearsPage;
