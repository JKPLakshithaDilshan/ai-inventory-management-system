import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth, RequireGuest } from '@/app/route-guards';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { PERMISSIONS } from '@/lib/rbac';

// Lazy loading Feature Pages for code-splitting
const LoginPage = lazy(() => import('@/features/dummy-pages').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/features/dummy-pages').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const PurchasesPage = lazy(() => import('@/features/purchases/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const PurchaseWizard = lazy(() => import('@/features/purchases/PurchaseWizard').then(m => ({ default: m.PurchaseWizard })));

const SalesPage = lazy(() => import('@/features/sales/SalesPage').then(m => ({ default: m.SalesPage })));
const CreateSalePage = lazy(() => import('@/features/sales/CreateSalePage').then(m => ({ default: m.CreateSalePage })));

const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage').then(m => ({ default: m.AlertsPage })));
const AIForecastPage = lazy(() => import('@/features/ai/AIForecastPage').then(m => ({ default: m.AIForecastPage })));
const AIReorderPage = lazy(() => import('@/features/ai/AIReorderPage').then(m => ({ default: m.AIReorderPage })));
const AuditLogsPage = lazy(() => import('@/features/audit/AuditLogsPage').then(m => ({ default: m.default || m })));
const UnauthorizedPage = lazy(() => import('@/features/auth/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

const UsersPage = lazy(() => import('@/features/users/UsersPage').then(m => ({ default: m.UsersPage })));
const DebugAuthPage = lazy(() => import('@/features/debug/DebugAuthPage').then(m => ({ default: m.DebugAuthPage })));

// Fallback skeleton loader while routes load
const PageLoader = () => (
    <div className="flex items-center justify-center p-8 h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export function AppRouter() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/debug-auth" element={<DebugAuthPage />} />

                {/* Auth Routes */}
                <Route element={<RequireGuest />}>
                    <Route element={<AuthLayout />}>
                        <Route path="/auth/login" element={<LoginPage />} />
                        <Route path="/auth/forgot-password" element={<div className="p-4">Forgot Password Placeholder</div>} />
                    </Route>
                </Route>

                {/* Protected App Routes */}
                <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />

                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        <Route path="/purchases">
                            <Route index element={<PurchasesPage />} />
                            <Route path="new" element={<PurchaseWizard />} />
                        </Route>
                        <Route path="/sales">
                            <Route index element={<SalesPage />} />
                            <Route path="new" element={<CreateSalePage />} />
                        </Route>

                        <Route element={<RequirePermission permission={PERMISSIONS.ALERTS_VIEW} />}>
                            <Route path="/alerts" element={<AlertsPage />} />
                        </Route>

                        <Route element={<RequirePermission permission={PERMISSIONS.AI_FORECAST_VIEW} />}>
                            <Route path="/ai/forecast" element={<AIForecastPage />} />
                        </Route>

                        <Route element={<RequirePermission permission={PERMISSIONS.AI_REORDER_VIEW} />}>
                            <Route path="/ai/reorder" element={<AIReorderPage />} />
                        </Route>

                        <Route element={<RequirePermission permission={PERMISSIONS.ADMIN_AUDIT_VIEW} />}>
                            <Route path="/audit-logs" element={<AuditLogsPage />} />
                        </Route>

                        <Route path="/settings" element={<SettingsPage />} />

                        {/* Admin only - requires permission */}
                        <Route element={<RequirePermission permission={PERMISSIONS.ADMIN_USERS_MANAGE} />}>
                            <Route path="/users" element={<UsersPage />} />
                        </Route>

                        {/* Unauthorized page */}
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />

                        {/* Fallback 404 */}
                        <Route path="*" element={
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <h1 className="text-4xl font-bold">404</h1>
                                <p className="text-xl text-muted-foreground">Page Not Found</p>
                            </div>
                        } />
                    </Route>
                </Route>
            </Routes>
        </Suspense>
    );
}
