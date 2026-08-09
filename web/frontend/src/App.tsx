import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DemoPage from './DemoPage'
import LandingAcademic from './LandingAcademic'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<LandingAcademic />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
