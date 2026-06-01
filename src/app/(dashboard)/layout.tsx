import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-screen bg-endurix-paper dark:bg-background">
            <Navbar />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
