import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';

export function AppLayout() {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <Topbar />

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
