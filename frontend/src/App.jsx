import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import { CASHIER_LEVEL_ID, REGISTRAR_LEVEL } from './utils/roles';
import AdminLayout from './layouts/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdmissionApply from './pages/public/AdmissionApply';
import ApplicationStatus from './pages/public/ApplicationStatus';
import NotFound from './pages/NotFound';
import Overview from './pages/admin/Overview';
import Profile from './pages/admin/Profile';
import AdmissionsPage from './pages/admin/AdmissionsPage';
import StudentsPage from './pages/admin/StudentsPage';
import TeachersPage from './pages/admin/TeachersPage';
import ParentsPage from './pages/admin/ParentsPage';
import AdminsPage from './pages/admin/AdminsPage';
import AcademicYearsPage from './pages/admin/AcademicYearsPage';
import GradeLevelsPage from './pages/admin/GradeLevelsPage';
import SectionsPage from './pages/admin/SectionsPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import FeesPage from './pages/admin/FeesPage';
import FeeSchedulesPage from './pages/admin/FeeSchedulesPage';
import DownpaymentsPage from './pages/admin/DownpaymentsPage';
import SchedulesPage from './pages/admin/SchedulesPage';
import ClassesPage from './pages/admin/ClassesPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import MessagesPage from './pages/shared/MessagesPage';
import RegistrarLayout from './layouts/RegistrarLayout';
import RegistrarOverview from './pages/registrar/Overview';
import RegistrarComingSoon from './pages/registrar/ComingSoon';
import EnrollmentPage from './pages/registrar/EnrollmentPage';
import CashierLayout from './layouts/CashierLayout';
import CashierOverview from './pages/cashier/Overview';
import NewPayment from './pages/cashier/NewPayment';
import PaymentHistory from './pages/cashier/PaymentHistory';
import PaymentConfirmations from './pages/cashier/PaymentConfirmations';
import CashierReceipts from './pages/cashier/Receipts';
import CashierStudentAccounts from './pages/cashier/StudentAccounts';
import OutstandingBalances from './pages/cashier/OutstandingBalances';
import CashierSession from './pages/cashier/Session';
import { CollectionSummary, DailyCollection, MonthlyCollection } from './pages/cashier/Reports';
import NotificationsPage from './pages/shared/NotificationsPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherOverview from './pages/teacher/Overview';
import ComingSoon from './pages/teacher/ComingSoon';
import TeacherClasses from './pages/teacher/Classes';
import TeacherProfile from './pages/teacher/Profile';
import TeacherAdvisoryStudents from './pages/teacher/AdvisoryStudents';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import ParentDashboard from './pages/dashboard/ParentDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admissions" element={<AdmissionApply />} />
      <Route path="/admissions/status" element={<ApplicationStatus />} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admissions" element={<AdmissionsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="academic-years" element={<AcademicYearsPage />} />
          <Route path="grade-levels" element={<GradeLevelsPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="fee-schedules" element={<FeeSchedulesPage />} />
          <Route path="downpayments" element={<DownpaymentsPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Route>

      {/* Registrar is an access level inside the admin role, so the guard checks
          both. The screens are the admin pages, mounted here so the registrar
          sidebar stays put instead of switching portals mid-task. The level is
          exact, not a floor: these screens belong to the registrar, and a Super
          Admin is sent back to their own portal. */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} exactAccessLevel={REGISTRAR_LEVEL} />}>
        <Route path="/registrar" element={<RegistrarLayout />}>
          <Route index element={<RegistrarOverview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admissions" element={<AdmissionsPage />} />
          <Route path="enrollment" element={<EnrollmentPage />} />
          <Route path="records" element={<RegistrarComingSoon title="Records Requests" />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Route>

      {/* Cashier is an access level inside the admin role. It shares level 2
          with Laboratory Staff, so the guard checks the level id. */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} accessLevelId={CASHIER_LEVEL_ID} />}>
        <Route path="/cashier" element={<CashierLayout />}>
          <Route index element={<CashierOverview />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="payments/new" element={<NewPayment />} />
          <Route path="confirmations" element={<PaymentConfirmations />} />
          <Route path="students" element={<CashierStudentAccounts />} />
          <Route path="outstanding" element={<OutstandingBalances />} />
          <Route path="receipts" element={<CashierReceipts />} />
          <Route path="session" element={<CashierSession />} />
          <Route path="reports/daily" element={<DailyCollection />} />
          <Route path="reports/monthly" element={<MonthlyCollection />} />
          <Route path="reports/summary" element={<CollectionSummary />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherOverview />} />
          {/* Built pages land here as they ship; until then the sidebar links
              reach an honest placeholder rather than a 404. */}
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="classes" element={<TeacherClasses />} />
          <Route path="students" element={<TeacherAdvisoryStudents />} />
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
