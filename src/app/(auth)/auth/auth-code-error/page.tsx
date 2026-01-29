'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function AuthCodeErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <Card className="w-full max-w-md border-destructive/50">
            <CardHeader>
                <CardTitle className="text-xl text-destructive text-center">
                    Authentication Error
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground">
                    {error || 'An error occurred during authentication. The link may have expired or is invalid.'}
                </p>
                <Button asChild>
                    <Link href="/login">Return to Login</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function AuthCodeErrorPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Suspense>
                <AuthCodeErrorContent />
            </Suspense>
        </div>
    );
}
