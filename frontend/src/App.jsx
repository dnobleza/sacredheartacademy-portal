import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Overview from './pages/admin/Overview';
import Profile from './pages/admin/Profile';
import StudentsPage from './pages/admin/StudentsPage';
import TeachersPage from './pages/admin/TeachersPage';
import ParentsPage from './pages/admin/ParentsPage';
import AdminsPage from './pages/admin/AdminsPage';
import AcademicYearsPage from './pages/admin/AcademicYearsPage';
import GradeLevelsPage from './pages/admin/GradeLevelsPage';
import SectionsPage from './pages/admin/SectionsPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import SchedulesPage from './pages/admin/SchedulesPage';
import ClassesPage from './pages/admin/ClassesPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import MessagesPage from './pages/shared/MessagesPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherOverview from './pages/teacher/Overview';
import ComingSoon from './pages/teacher/ComingSoon';
import TeacherClasses from './pages/teacher/Classes';
import TeacherProfile from './pages/teacher/Profile';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import ParentDashboard from './pages/dashboard/ParentDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="academic-years" element={<AcademicYearsPage />} />
          <Route path="grade-levels" element={<GradeLevelsPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherOverview />} />
          {/* Built pages land here as they ship; until then the sidebar links
              reach an honest placeholder rather than a 404. */}
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="classes" element={<TeacherClasses />} />
          <Route path="students" element={<ComingSoon title="Students" />} />
          <Route path="attendance" element={<ComingSoon title="Attendance" />} />
          <Route path="grades" element={<ComingSoon title="Grades" />} />
          <Route path="assignments" element={<ComingSoon title="Assignments" />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<StudentDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
        <Route path="/parent" element={<ParentDashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
