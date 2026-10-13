import { Route, Routes } from 'react-router-dom';
import { lazy } from 'react';
import { SiteLayout } from '../layouts/SiteLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
const AccountPage = lazy(() =>
  import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })),
);
const ShopPage = lazy(() =>
  import('../pages/ShopPage').then((module) => ({ default: module.ShopPage })),
);
import { SessionGate } from '../components/SessionGate';
const CatalogPage = lazy(() =>
  import('../pages/CatalogPage').then((module) => ({ default: module.CatalogPage })),
);
const StoresPage = lazy(() =>
  import('../pages/StoresPage').then((module) => ({ default: module.StoresPage })),
);
const PublicShopPage = lazy(() =>
  import('../pages/PublicShopPage').then((module) => ({ default: module.PublicShopPage })),
);
const ProductPage = lazy(() =>
  import('../pages/ProductPage').then((module) => ({ default: module.ProductPage })),
);
const CartPage = lazy(() =>
  import('../pages/CartPage').then((module) => ({ default: module.CartPage })),
);
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogo" element={<CatalogPage />} />
        <Route path="tiendas" element={<StoresPage />} />
        <Route path="tiendas/:slug" element={<PublicShopPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="ingresar" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route element={<SessionGate />}>
          <Route path="carrito" element={<CartPage />} />
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
