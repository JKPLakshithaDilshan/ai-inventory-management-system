'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/useAuthStore';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

export function LoginPage() {
    const navigate = useNavigate();
    const { login, loading, error, clearError } = useAuthStore();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        // Validation
        if (!username.trim()) {
            setLocalError('Username is required');
            return;
        }
        if (!password) {
            setLocalError('Password is required');
            return;
        }

        try {
            // Call the store's login method (which handles token + user fetch)
            await login(username, password);
            
            // On success, navigate to dashboard
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            // Error is already set in store, but format it nicely
            const message = err instanceof Error ? err.message : 'Login failed';
            
            if (message.includes('[401]') || message.includes('Invalid') || message.includes('Incorrect')) {
                setLocalError('Invalid username or password');
            } else if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
                setLocalError('Cannot connect to backend (http://localhost:8000). Is the server running?');
            } else {
                setLocalError(message.replace(/^\[\d+\]\s*/, '')); // Remove status code prefix
            }
        }
    };

    const errorMessage = localError || error;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-2 text-center pb-6">
                    <CardTitle className="text-3xl">AI Inventory System</CardTitle>
                    <CardDescription className="text-base">
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Error Alert */}
                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username or Email</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                autoComplete="username"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="pr-10"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">Toggle password visibility</span>
                                </Button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !username.trim() || !password}
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        <div className="text-center text-sm">
                            <Link to="/auth/forgot-password" className="text-primary hover:underline">
                                Forgot your password?
                            </Link>
                        </div>
                    </form>

                    {/* Development Credentials */}
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                            <span className="font-semibold text-foreground">💡 Dev Credentials:</span>
                            <br />
                            <code className="text-xs bg-background px-1 py-0.5 rounded">admin</code> / 
                            <code className="text-xs bg-background px-1 py-0.5 rounded ml-1">admin123</code>
                        </p>
                    </div>

                    {/* Features Info */}
                    <div className="mt-6 space-y-2">
                        <p className="text-xs font-semibold text-center">System Features:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>✓ Inventory Management</div>
                            <div>✓ Purchase Orders</div>
                            <div>✓ Sales Tracking</div>
                            <div>✓ AI Forecasting</div>
                            <div>✓ Stock Ledger</div>
                            <div>✓ Audit Logs</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
