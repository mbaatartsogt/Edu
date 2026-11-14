import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { usePageTracking } from './lib/track';

// Админ хэсгийг тусад нь ачаална (landing хурдан нээгдэнэ)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const EnrollmentsPage = lazy(() => import('./pages/admin/EnrollmentsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ContentPages = lazy(() => import('./pages/admin/ContentPages'));
const ChatLeadsPage = lazy(() => import('./pages/admin/ChatLeadsPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const Login = lazy(() => import('./pages/account/Login'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const Account = lazy(() => import('./pages/account/Account'));
const Checkout = lazy(() => import('./pages/account/Checkout'));
const OrderPage = lazy(() => import('./pages/account/OrderPage'));
const Points = lazy(() => import('./pages/account/Points'));
const ProgramsPage = lazy(() => import('./pages/account/ProgramsPage'));
const Cart = lazy(() => import('./pages/account/Cart'));
const Orders = lazy(() => import('./pages/account/Orders'));
const VerifyEmail = lazy(() => import('./pages/account/AuthPages').then((m) => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./pages/account/AuthPages').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/account/AuthPages').then((m) => ({ default: m.ResetPassword })));
const RedemptionsPage = lazy(() => import('./pages/admin/RedemptionsPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const LessonsAdminPage = lazy(() => import('./pages/admin/LessonsPage'));
const Lessons = lazy(() => import('./pages/account/Lessons'));
const LessonPlayer = lazy(() => import('./pages/account/LessonPlayer'));
const ProgramStudentsPage = lazy(() => import('./pages/admin/ProgramStudentsPage'));

export default function App() {
  usePageTracking();
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-brand-mist font-bold text-brand-blue">Ачаалж байна…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/account" element={<AccountLayout />}>
          <Route index element={<Account />} />
          <Route path="checkout/:programId" element={<Checkout />} />
          <Route path="orders/:id" element={<OrderPage />} />
          <Route path="points" element={<Points />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="lessons/:id" element={<LessonPlayer />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="requests" element={<EnrollmentsPage />} />
          <Route path="programs" element={<ContentPages kind="programs" />} />
          <Route path="teachers" element={<ContentPages kind="teachers" />} />
          <Route path="branches" element={<ContentPages kind="branches" />} />
          <Route path="chats" element={<ChatLeadsPage />} />
          <Route path="redemptions" element={<RedemptionsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="students" element={<ProgramStudentsPage />} />
          <Route path="lessons" element={<LessonsAdminPage />} />
          <Route path="rewards" element={<ContentPages kind="rewards" />} />
          <Route path="faqs" element={<ContentPages kind="faqs" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
