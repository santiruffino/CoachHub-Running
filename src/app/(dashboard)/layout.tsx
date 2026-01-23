import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-screen bg-background">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
