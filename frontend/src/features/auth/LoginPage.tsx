'use client';

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';
import { ArrowRight } from 'lucide-react';

type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'STAFF' | 'VIEWER';

const roles: { label: string; value: Role; description: string }[] = [
    { label: 'Admin', value: 'ADMIN', description: 'Full system access, audit logs' },
    { label: 'HR Manager', value: 'HR', description: 'User & access management' },
    { label: 'Inventory Manager', value: 'MANAGER', description: 'View analytics & forecasts' },
    { label: 'Staff', value: 'STAFF', description: 'Create orders & sales' },
    { label: 'Viewer', value: 'VIEWER', description: 'Read-only access' },
];

export function LoginPage() {
    const navigate = useNavigate();
    const { loginAsRole } = useAuthStore();

    const handleLogin = (role: Role) => {
        loginAsRole(role);
        navigate('/dashboard', { replace: true });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="space-y-2 text-center pb-4 border-b">
                    <CardTitle className="text-3xl">AI Inventory System</CardTitle>
                    <CardDescription className="text-base">
                        Development Login — Select a role to continue
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-8">
                    <div className="space-y-4">
                        {/* Role Buttons Grid */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                            {roles.map(role => (
                                <button
                                    key={role.value}
                                    onClick={() => handleLogin(role.value)}
                                    className="group relative p-4 rounded-lg border border-input bg-background hover:bg-accent transition-all duration-200 text-left hover:shadow-md hover:border-primary/50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                {role.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {role.description}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Device Info */}
                        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border/50">
                            <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">ℹ️ Development Mode:</span> This login is for demo purposes only. In production, use your organization's auth provider (OAuth, SAML, etc.).
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="mt-6 space-y-2">
                            <p className="text-sm font-semibold">Quick Demo Flow:</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <li>✓ Dashboard with KPIs</li>
                                <li>✓ Product & Supplier Management</li>
                                <li>✓ Purchase & Sales Workflows</li>
                                <li>✓ AI-powered Alerts</li>
                                <li>✓ Demand Forecasting</li>
                                <li>✓ Audit Logs (Admin only)</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
