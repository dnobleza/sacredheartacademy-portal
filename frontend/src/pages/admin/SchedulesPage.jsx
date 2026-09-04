import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function SchedulesPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.schedules} />;
}

export default SchedulesPage;
