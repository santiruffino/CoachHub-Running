import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { NotificationToastListener } from '@/features/notifications/components/NotificationToastListener';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-screen bg-endurix-paper dark:bg-background">
            <Navbar />
            <MobileHeader />
            <main className="flex-1 overflow-y-auto dashboard-main-scroll">
                {children}
            </main>
            <BottomNav />
            <InstallPrompt />
            <NotificationToastListener />
            <Toaster position="top-right" richColors />
        </div>
    );
}
