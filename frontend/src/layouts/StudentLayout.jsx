import PortalLayout from './PortalLayout';
import { STUDENT_NAV } from '../data/studentResources';

function StudentLayout() {
  return (
    <PortalLayout nav={STUDENT_NAV} storageKey="student.sidebar.collapsed" portalLabel="Student" />
  );
}

export default StudentLayout;
