'use client';
import { appLogger } from '@/lib/app-logger';

import { useCallback, useEffect, useState } from 'react';
import { notificationsService } from '@/features/notifications/services/notifications.service';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushSubscription() {
    const [supported, setSupported] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSupport = async () => {
            const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
            setSupported(isSupported);

            if (!isSupported) {
                setLoading(false);
                return;
            }

            // The service worker caches /_next/static/ assets cache-first, which breaks
            // Turbopack HMR in dev (chunk hashes change on every rebuild → ChunkLoadError).
            // Only run it in production; in dev, tear down any SW/caches left over from a
            // previous run so the local environment self-heals.
            if (process.env.NODE_ENV !== 'production') {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map((registration) => registration.unregister()));
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((key) => caches.delete(key)));
                    }
                } catch (err) {
                    appLogger.error('Failed to tear down service worker in development:', err);
                }
                setLoading(false);
                return;
            }

            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                const existingSubscription = await registration.pushManager.getSubscription();
                setSubscribed(Boolean(existingSubscription));
            } catch (err) {
                appLogger.error('Failed to check existing push subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        void checkSupport();
    }, []);

    const subscribe = useCallback(async () => {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            appLogger.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            });

            const subscriptionJson = subscription.toJSON();
            if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
                return false;
            }

            await notificationsService.savePushSubscription({
                endpoint: subscriptionJson.endpoint,
                keys: { p256dh: subscriptionJson.keys.p256dh, auth: subscriptionJson.keys.auth },
            });

            setSubscribed(true);
            return true;
        } catch (err) {
            appLogger.error('Failed to subscribe to push notifications:', err);
            return false;
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                setSubscribed(false);
                return true;
            }

            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();
            await notificationsService.removePushSubscription(endpoint);
            setSubscribed(false);
            return true;
        } catch (err) {
            appLogger.error('Failed to unsubscribe from push notifications:', err);
            return false;
        }
    }, []);

    return { supported, subscribed, loading, subscribe, unsubscribe };
}
