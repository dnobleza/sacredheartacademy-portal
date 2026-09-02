import DashboardLayout from '../../layouts/DashboardLayout';

function ParentDashboard() {
  return (
    <DashboardLayout
      title="Parent portal"
      description="You are signed in as a parent. Your children's grades, attendance, and announcements will live here."
    />
  );
}

export default ParentDashboard;
