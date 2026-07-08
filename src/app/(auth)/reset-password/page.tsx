import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm sm:max-w-md">
                <ResetPasswordForm />
            </div>
        </div>
    );
}
