import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/LandingPage';

import DashboardPage   from './pages/teacher/DashboardPage';
import QuizBuilderPage from './pages/teacher/QuizBuilderPage';
import GameHostPage    from './pages/teacher/GameHostPage';
import AnalyticsPage   from './pages/teacher/AnalyticsPage';

import JoinPage    from './pages/student/JoinPage';
import LobbyPage   from './pages/student/LobbyPage';
import GamePage    from './pages/student/GamePage';
import ResultsPage from './pages/student/ResultsPage';

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/register"     element={<RegisterPage />} />
            <Route path="/join"         element={<JoinPage />} />
            <Route path="/join/:code"   element={<JoinPage />} />
            <Route path="/lobby/:code"  element={<LobbyPage />} />
            <Route path="/play/:code"   element={<GamePage />} />
            <Route path="/results/:code" element={<ResultsPage />} />

            {/* Teacher */}
            <Route element={<ProtectedRoute role="teacher" />}>
              <Route path="/dashboard"           element={<DashboardPage />} />
              <Route path="/quiz/new"             element={<QuizBuilderPage />} />
              <Route path="/quiz/:id/edit"        element={<QuizBuilderPage />} />
              <Route path="/host/:code"           element={<GameHostPage />} />
              <Route path="/analytics/:code"      element={<AnalyticsPage />} />
            </Route>

            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}
