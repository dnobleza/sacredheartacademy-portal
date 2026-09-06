import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function FeeSchedulesPage() {
  return <ResourcePage resource={ADMIN_RESOURCES['fee-schedules']} />;
}

export default FeeSchedulesPage;
