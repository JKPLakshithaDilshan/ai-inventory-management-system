import { useState } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROLES, getRoleDisplayName, type Role } from '@/lib/rbac';
import { LogOut, Sparkles } from 'lucide-react';

export function SettingsPage() {
    const { user, loginAsRole, logout } = useAuthStore();
    const [showDevTools, setShowDevTools] = useState(false);
    const isDev = import.meta.env.DEV;

    if (!user) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Not authenticated</p>
            </div>
        );
    }

    const currentPermissions = user.permissions || [];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Settings & Preferences"
                description="Manage your account and system settings."
            />

            {/* Current User Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Current User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Name</p>
                            <p className="font-medium">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Email</p>
                            <p className="font-medium">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Role</p>
                            <Badge variant="outline" className="bg-primary/10">
                                {getRoleDisplayName(user.role)}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Permissions Count</p>
                            <p className="font-medium">{currentPermissions.length} permissions</p>
                        </div>
                    </div>

                    <Button variant="destructive" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardContent>
            </Card>

            {/* Permissions List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Permissions</CardTitle>
                    <CardDescription>
                        {currentPermissions.length} permissions available for {getRoleDisplayName(user.role)} role
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {currentPermissions.map(perm => (
                            <Badge key={perm} variant="secondary" className="font-mono text-xs">
                                {perm}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Dev Tools */}
            {isDev && (
            <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Developer Tools
                            </CardTitle>
                            <CardDescription>
                                Quick role switching for testing (dev only)
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDevTools(!showDevTools)}
                        >
                            {showDevTools ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                </CardHeader>

                {showDevTools && (
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-3">Switch to role:</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(ROLES).map(role => (
                                    <Button
                                        key={role}
                                        variant={user.role === role ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => loginAsRole(role as Role)}
                                    >
                                        {getRoleDisplayName(role)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                ⚠️ Dev tools are for testing only. The role switcher persists in localStorage.
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>
            )}
        </div>
    );
}
