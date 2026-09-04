import PortalLayout from './PortalLayout';
import { TEACHER_NAV } from '../data/teacherResources';

function TeacherLayout() {
  return <PortalLayout nav={TEACHER_NAV} storageKey="teacher.sidebar.collapsed" portalLabel="Teacher" />;
}

export default TeacherLayout;
