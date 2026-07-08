import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm sm:max-w-md">
                <ForgotPasswordForm />
            </div>
        </div>
    );
}
