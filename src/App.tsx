import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Businesses from './pages/Businesses';
import Reports from './pages/Reports';
import Manual from './pages/Manual';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/businesses" element={<Businesses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/manual" element={<Manual />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
