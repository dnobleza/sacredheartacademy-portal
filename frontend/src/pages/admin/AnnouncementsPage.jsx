import ResourcePage from '../../components/admin/ResourcePage';
import { ADMIN_RESOURCES } from '../../data/adminResources';

function AnnouncementsPage() {
  return <ResourcePage resource={ADMIN_RESOURCES.announcements} />;
}

export default AnnouncementsPage;
