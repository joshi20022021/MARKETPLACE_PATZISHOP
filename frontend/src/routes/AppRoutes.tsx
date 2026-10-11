import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from '../layouts/SiteLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AccountPage } from '../pages/AccountPage';
import { ShopPage } from '../pages/ShopPage';
import { SessionGate } from '../components/SessionGate';
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="ingresar" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route element={<SessionGate />}>
          <Route path="cuenta" element={<AccountPage />} />
          <Route element={<SessionGate seller />}>
            <Route path="cuenta/tienda" element={<ShopPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
