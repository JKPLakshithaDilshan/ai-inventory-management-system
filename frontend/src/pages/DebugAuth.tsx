import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login, me } from '@/services/auth';

export default function DebugAuth() {
    const [status, setStatus] = useState('Idle');
    const [meResponse, setMeResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            setStatus('Logging in...');
            await login('admin', 'admin123');
            setStatus('Logged in ✅');
        } catch (error) {
            setStatus(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMe = async () => {
        try {
            setIsLoading(true);
            setStatus('Calling /auth/me...');
            const user = await me();
            setMeResponse(JSON.stringify(user, null, 2));
            setStatus('/auth/me success ✅');
        } catch (error) {
            setStatus(`/auth/me failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Debug Auth</CardTitle>
                    <CardDescription>Temporary local page for auth smoke tests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={handleLogin} disabled={isLoading}>Login (admin/admin123)</Button>
                        <Button variant="outline" onClick={handleMe} disabled={isLoading}>Call /auth/me</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Status: {status}</p>
                    <pre className="bg-muted p-3 rounded-md overflow-auto text-xs">{meResponse || 'No /me response yet.'}</pre>
                </CardContent>
            </Card>
        </div>
    );
}
