'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export type AlertType = 'error' | 'success' | 'warning';

interface AlertDialogProps {
    open: boolean;
    onClose: () => void;
    type: AlertType;
    title?: string;
    message: string;
    confirmText?: string;
}

export function AlertDialog({
    open,
    onClose,
    type,
    title,
    message,
    confirmText = 'OK',
}: AlertDialogProps) {
    const getIcon = () => {
        switch (type) {
            case 'error':
                return <AlertCircle className="h-6 w-6 text-red-500" />;
            case 'success':
                return <CheckCircle className="h-6 w-6 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
        }
    };

    const getDefaultTitle = () => {
        switch (type) {
            case 'error':
                return 'Error';
            case 'success':
                return 'Success';
            case 'warning':
                return 'Warning';
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'error':
                return 'border-l-4 border-l-red-500';
            case 'success':
                return 'border-l-4 border-l-green-500';
            case 'warning':
                return 'border-l-4 border-l-yellow-500';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className={`sm:max-w-md ${getBorderColor()}`}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <DialogTitle>{title || getDefaultTitle()}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Hook to manage alert state
export function useAlertDialog() {
    const [alertState, setAlertState] = useState<{
        open: boolean;
        type: AlertType;
        title?: string;
        message: string;
        confirmText?: string;
    }>({
        open: false,
        type: 'error',
        message: '',
    });

    const showAlert = (
        type: AlertType,
        message: string,
        title?: string,
        confirmText?: string
    ) => {
        setAlertState({
            open: true,
            type,
            message,
            title,
            confirmText,
        });
    };

    const closeAlert = () => {
        setAlertState((prev) => ({ ...prev, open: false }));
    };

    return {
        alertState,
        showAlert,
        closeAlert,
    };
}
