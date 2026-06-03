import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { getServerUser } from '@/features/auth/services/auth.server';
import { AuthSeeder } from '@/features/auth/components/AuthSeeder';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getServerUser();

    return (
        <div className="flex flex-col h-screen bg-endurix-paper dark:bg-background">
            <AuthSeeder user={user} />
            <Navbar />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
