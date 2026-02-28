import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <div className="flex flex-col items-center text-center max-w-md">
                {/* Icon */}
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>

                {/* Main Error Code */}
                <h1 className="text-5xl font-bold tracking-tight mb-2">403</h1>

                {/* Title */}
                <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>

                {/* Description */}
                <p className="text-muted-foreground mb-6">
                    You don't have permission to access this resource. Your current role doesn't 
                    include the required permissions.
                </p>

                {/* Contact Info */}
                <p className="text-sm text-muted-foreground mb-8">
                    If you believe this is an error, please contact your administrator.
                </p>

                {/* Buttons */}
                <div className="flex gap-3 w-full">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="flex-1"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1"
                    >
                        To Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
