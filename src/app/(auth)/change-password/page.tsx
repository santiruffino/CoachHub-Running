import PasswordChangeForm from '@/features/auth/components/PasswordChangeForm';

export default function ChangePasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm sm:max-w-md">
                <PasswordChangeForm />
            </div>
        </div>
    );
}
