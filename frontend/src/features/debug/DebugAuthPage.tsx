import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { me } from '@/services/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw, User } from 'lucide-react';

export function DebugAuthPage() {
    const { isAuthenticated, user, token, logout } = useAuthStore();
    const [meResponse, setMeResponse] = useState<Awaited<ReturnType<typeof me>> | null>(null);
    const [meError, setMeError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleTestMe = async () => {
        setLoading(true);
        setMeError(null);
        setMeResponse(null);

        try {
            const response = await me();
            setMeResponse(response);
        } catch (error: unknown) {
            setMeError(error instanceof Error ? error.message : 'Failed to call /auth/me');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">🔧 Auth Debug Panel</h1>
                <p className="text-muted-foreground">Development tool for testing authentication</p>
            </div>

            {/* Auth Store State */}
            <Card>
                <CardHeader>
                    <CardTitle>Auth Store State</CardTitle>
                    <CardDescription>Current authentication state from Zustand store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Authenticated</p>
                            <div className="flex items-center gap-2 mt-1">
                                {isAuthenticated ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <Badge variant="default">Yes</Badge>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <Badge variant="destructive">No</Badge>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Token Exists</p>
                            <div className="flex items-center gap-2 mt-1">
                                {token ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <Badge variant="default">Yes</Badge>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-5 w-5 text-destructive" />
                                        <Badge variant="destructive">No</Badge>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {token && (
                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Token (truncated)</p>
                            <code className="text-xs bg-muted p-2 rounded block break-all">
                                {token.substring(0, 50)}...{token.substring(token.length - 10)}
                            </code>
                        </div>
                    )}

                    {user && (
                        <div className="pt-4 border-t space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">User Object</p>
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <User className="h-5 w-5 text-primary mt-0.5" />
                                <div className="space-y-1 flex-1">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                    <Badge variant="outline" className="text-xs">
                                        {user.role}
                                    </Badge>
                                </div>
                            </div>

                            <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                    Show Raw JSON
                                </summary>
                                <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">
                                    {JSON.stringify(user, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LocalStorage State */}
            <Card>
                <CardHeader>
                    <CardTitle>LocalStorage State</CardTitle>
                    <CardDescription>Persisted data in browser storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">access_token</p>
                        {localStorage.getItem('access_token') ? (
                            <code className="text-xs bg-muted p-2 rounded block break-all">
                                {localStorage.getItem('access_token')?.substring(0, 50)}...
                            </code>
                        ) : (
                            <Badge variant="secondary">Not Set</Badge>
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">refresh_token</p>
                        {localStorage.getItem('refresh_token') ? (
                            <code className="text-xs bg-muted p-2 rounded block break-all">
                                {localStorage.getItem('refresh_token')?.substring(0, 50)}...
                            </code>
                        ) : (
                            <Badge variant="secondary">Not Set</Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* API Test */}
            <Card>
                <CardHeader>
                    <CardTitle>API Test: GET /auth/me</CardTitle>
                    <CardDescription>Test direct API call to verify backend connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleTestMe} disabled={loading || !token}>
                        {loading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Calling API...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Call /auth/me
                            </>
                        )}
                    </Button>

                    {!token && (
                        <p className="text-xs text-muted-foreground">
                            ⚠️ No token available. Please login first.
                        </p>
                    )}

                    {meResponse && (
                        <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                                ✓ Success
                            </p>
                            <pre className="text-xs overflow-auto bg-muted p-3 rounded">
                                {JSON.stringify(meResponse, null, 2)}
                            </pre>
                        </div>
                    )}

                    {meError && (
                        <div className="border rounded-lg p-4 bg-destructive/5 border-destructive/20">
                            <p className="text-sm font-medium text-destructive mb-2">✗ Error</p>
                            <p className="text-xs text-muted-foreground">{meError}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Reload Page
                    </Button>
                    <Button variant="destructive" onClick={logout} disabled={!isAuthenticated}>
                        Force Logout
                    </Button>
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader>
                    <CardTitle className="text-blue-700 dark:text-blue-400">💡 How to Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Login via <code className="text-xs bg-background px-1 py-0.5 rounded">/auth/login</code></p>
                    <p>2. Return to this page to see auth state</p>
                    <p>3. Click "Call /auth/me" to test backend connectivity</p>
                    <p>4. Use "Force Logout" to clear all auth data</p>
                    <p className="pt-2 text-xs">
                        <span className="font-semibold text-foreground">Backend:</span> http://localhost:8000/api/v1
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
