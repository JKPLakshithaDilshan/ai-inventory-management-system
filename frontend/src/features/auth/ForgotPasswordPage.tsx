import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { requestPasswordReset } from '@/services/auth';

const GENERIC_SUCCESS_MESSAGE =
    'If an account with that email exists, a password reset link has been sent.';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const validateEmail = (value: string): string | null => {
        if (!value.trim()) return 'Email is required';
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!isValidEmail) return 'Please enter a valid email address';
        return null;
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            return;
        }

        setLoading(true);

        try {
            const response = await requestPasswordReset(email.trim());
            setSuccessMessage(response.message || GENERIC_SUCCESS_MESSAGE);
        } catch (err: any) {
            const message = err?.message || 'Unable to process your request right now.';
            setError(message.replace(/^\[\d+\]\s*/, ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="space-y-2 text-center pb-6">
                <CardTitle className="text-2xl">Forgot Password</CardTitle>
                <CardDescription>
                    Enter your account email and we will send a secure password reset link.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {successMessage ? (
                    <div className="space-y-4">
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Alert>

                        <Button asChild className="w-full">
                            <Link to="/auth/login">Back to Sign In</Link>
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending reset link...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground">
                            Remembered your password?{' '}
                            <Link className="text-primary hover:underline" to="/auth/login">
                                Back to sign in
                            </Link>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
