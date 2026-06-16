import { Routes, Route } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
import { PublicLayout } from './components/layout/PublicLayout'
import { AppLayout } from './components/layout/AppLayout'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CheckoutPage from './pages/CheckoutPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import NewsPage from './pages/NewsPage'
import NewsDetailPage from './pages/NewsDetailPage'
import CalendarPage from './pages/CalendarPage'
import ForumPage from './pages/ForumPage'
import ForumTopicPage from './pages/ForumTopicPage'
import NotFoundPage from './pages/NotFoundPage'

import DashboardPage from './pages/DashboardPage'
import MaterialsPage from './pages/MaterialsPage'
import MaterialDetailPage from './pages/MaterialDetailPage'
import SurveysPage from './pages/SurveysPage'
import SurveyDetailPage from './pages/SurveyDetailPage'
import NotificationsPage from './pages/NotificationsPage'

import { AdminGuard } from './components/admin/AdminGuard'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminCourseEditPage from './pages/admin/AdminCourseEditPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Публичная зона */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/:id" element={<ForumTopicPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/materials/:id" element={<MaterialDetailPage />} />
          <Route path="/surveys" element={<SurveysPage />} />
          <Route path="/surveys/:id" element={<SurveyDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        {/* Аутентификация (без общего каркаса) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Личный кабинет (защищённая зона) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Админ-зона (только для роли admin) */}
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminCoursesPage />} />
            <Route path="/admin/courses/new" element={<AdminCourseEditPage />} />
            <Route path="/admin/courses/:id" element={<AdminCourseEditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
