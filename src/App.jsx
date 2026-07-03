import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MatchProvider } from './context/MatchContext'
import MatchModal from './components/MatchModal'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Swipe from './pages/Swipe'
import Matches from './pages/Matches'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const location = useLocation()
  const showNavbar = ['/swipe', '/matches', '/profile'].includes(location.pathname)

  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-white shadow-xl relative">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
        <Route path="/swipe" element={<ProtectedRoute><Swipe /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
        <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
      {showNavbar && <Navbar />}
      <MatchModal />
    </div>
  )
}

export default function App() {
  return (
    <MatchProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </MatchProvider>
  )
}
