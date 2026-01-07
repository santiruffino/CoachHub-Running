export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen grid place-items-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tighter">
                        COACH<span className="text-primary">HUB</span>
                    </h1>
                </div>
                {children}
            </div>
        </div>
    );
}
