'use client';

import { useState, useId } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Lock, Sparkles, Users, Vote, Headphones } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface FormState {
    name: string;
    email: string;
    role: string;
    teamSize: string;
}

const BENEFIT_ICONS = [Sparkles, Headphones, Vote, Users] as const;

const easeOut = [0.22, 1, 0.36, 1] as const;

export function WishlistSection() {
    const t = useTranslations('landing.wishlist');
    const locale = useLocale();
    const nameId = useId();
    const emailId = useId();
    const roleId = useId();
    const teamSizeId = useId();

    const [values, setValues] = useState<FormState>({
        name: '',
        email: '',
        role: '',
        teamSize: '',
    });
    const [status, setStatus] = useState<Status>('idle');
    const [errorCode, setErrorCode] = useState<string | null>(null);
    // Honeypot: real users never fill this hidden field; bots usually do.
    const [botField, setBotField] = useState('');

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const update = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorCode(null);

        // Honeypot tripped → silently pretend success without hitting the API.
        if (botField) {
            setStatus('success');
            return;
        }

        if (!values.name || !values.email || !values.role || !values.teamSize) {
            setStatus('error');
            setErrorCode('required');
            return;
        }

        if (!isValidEmail(values.email)) {
            setStatus('error');
            setErrorCode('invalidEmail');
            return;
        }

        setStatus('submitting');

        try {
            const response = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    role: values.role,
                    teamSize: values.teamSize,
                    locale,
                }),
            });

            if (response.status === 201) {
                setStatus('success');
                return;
            }

            const data = (await response.json().catch(() => ({}))) as { error?: string };
            setStatus('error');
            setErrorCode(data.error ?? 'generic');
        } catch {
            setStatus('error');
            setErrorCode('generic');
        }
    };

    const errorMessage = (() => {
        if (status !== 'error') return null;
        if (errorCode === 'required') return t('form.errorRequired');
        if (errorCode === 'invalidEmail') return t('form.errorInvalidEmail');
        if (errorCode === 'ALREADY_REGISTERED') return t('form.errorDuplicate');
        return t('form.errorGeneric');
    })();

    const benefits = [
        t('benefits.pricing'),
        t('benefits.support'),
        t('benefits.roadmap'),
        t('benefits.community'),
    ];

    return (
        <section
            id="wishlist"
            className="py-24 lg:py-36 bg-endurix-paper dark:bg-background overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
                    {/* Left — Pitch */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6 }}
                        className="lg:col-span-5"
                    >
                        <span
                            className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('eyebrow')}
                        </span>

                        <h2
                            className="font-bold text-endurix-black dark:text-foreground text-2xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[1.05] tracking-tight uppercase"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('title1')}
                            <br />
                            <span className="text-endurix-orange">{t('title2')}</span>
                        </h2>

                        <motion.div
                            className="mt-6 h-1 bg-endurix-orange"
                            initial={{ width: 0 }}
                            whileInView={{ width: 80 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        />

                        <p className="mt-8 text-endurix-black/70 dark:text-foreground/75 text-base leading-relaxed max-w-md">
                            {t('subtitle')}
                        </p>

                        {/* Benefits */}
                        <div className="mt-10">
                            <span
                                className="block text-[10px] text-endurix-black/50 dark:text-foreground/60 tracking-widest mb-4"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {t('benefitsTitle')}
                            </span>
                            <ul className="space-y-3">
                                {benefits.map((benefit, i) => {
                                    const Icon = BENEFIT_ICONS[i] ?? Sparkles;
                                    return (
                                        <motion.li
                                            key={benefit}
                                            initial={{ opacity: 0, x: -12 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                                            className="flex items-start gap-3"
                                        >
                                            <span className="mt-0.5 w-7 h-7 border border-endurix-black/20 dark:border-white/15 flex items-center justify-center shrink-0">
                                                <Icon
                                                    className="w-3.5 h-3.5 text-endurix-orange"
                                                    strokeWidth={1.75}
                                                />
                                            </span>
                                            <span className="text-sm text-endurix-black dark:text-foreground/90 leading-relaxed">
                                                {benefit}
                                            </span>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Trust line */}
                        <p
                            className="mt-8 text-[10px] text-endurix-black/50 dark:text-foreground/55 tracking-widest uppercase flex items-center gap-2"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            <Lock className="w-3 h-3" />
                            {t('trust')}
                        </p>
                    </motion.div>

                    {/* Right — Form card */}
                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
                        className="lg:col-span-7"
                    >
                        <div className="relative bg-white dark:bg-card border border-endurix-black/15 dark:border-white/10 p-5 sm:p-8 lg:p-10 shadow-sm dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
                            {/* Orange corner mark */}
                            <div className="absolute top-0 left-0 w-12 h-1 bg-endurix-orange" />

                            <div className="flex items-center justify-between mb-8">
                                <span
                                    className="text-[10px] text-endurix-black/60 dark:text-foreground/60 tracking-widest"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {t('badge')}
                                </span>
                            </div>

                            {status === 'success' ? (
                                <SuccessState
                                    title={t('form.success')}
                                    detail={t('form.successDetail')}
                                />
                            ) : (
                                <form
                                    onSubmit={handleSubmit}
                                    noValidate
                                    className="space-y-6"
                                >
                                    {/* Honeypot — visually hidden, off the tab order. */}
                                    <div
                                        aria-hidden
                                        className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
                                    >
                                        <label htmlFor="company-website">No completar</label>
                                        <input
                                            id="company-website"
                                            type="text"
                                            name="company-website"
                                            tabIndex={-1}
                                            autoComplete="off"
                                            value={botField}
                                            onChange={(e) => setBotField(e.target.value)}
                                        />
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label
                                            htmlFor={nameId}
                                            className="block text-[10px] font-bold text-endurix-black/70 dark:text-foreground/70 tracking-widest uppercase mb-2"
                                            style={{
                                                fontFamily:
                                                    'var(--font-ibm-plex-mono, monospace)',
                                            }}
                                        >
                                            {t('form.nameLabel')}
                                        </label>
                                        <Input
                                            id={nameId}
                                            type="text"
                                            name="name"
                                            autoComplete="name"
                                            value={values.name}
                                            onChange={(e) => update('name')(e.target.value)}
                                            placeholder={t('form.namePlaceholder')}
                                            disabled={status === 'submitting'}
                                            required
                                            className="border-endurix-black/20 dark:border-white/15 dark:bg-white/[0.02] dark:focus-visible:bg-white/[0.04] pl-3"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label
                                            htmlFor={emailId}
                                            className="block text-[10px] font-bold text-endurix-black/70 dark:text-foreground/70 tracking-widest uppercase mb-2"
                                            style={{
                                                fontFamily:
                                                    'var(--font-ibm-plex-mono, monospace)',
                                            }}
                                        >
                                            {t('form.emailLabel')}
                                        </label>
                                        <Input
                                            id={emailId}
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            value={values.email}
                                            onChange={(e) => update('email')(e.target.value)}
                                            placeholder={t('form.emailPlaceholder')}
                                            disabled={status === 'submitting'}
                                            required
                                            className="border-endurix-black/20 dark:border-white/15 dark:bg-white/[0.02] dark:focus-visible:bg-white/[0.04] pl-3"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                                        {/* Role */}
                                        <div>
                                            <label
                                                htmlFor={roleId}
                                                className="block text-[10px] font-bold text-endurix-black/70 dark:text-foreground/70 tracking-widest uppercase mb-2"
                                                style={{
                                                    fontFamily:
                                                        'var(--font-ibm-plex-mono, monospace)',
                                                }}
                                            >
                                                {t('form.roleLabel')}
                                            </label>
                                            <Select
                                                value={values.role}
                                                onValueChange={(v) => update('role')(v)}
                                                disabled={status === 'submitting'}
                                            >
                                                <SelectTrigger
                                                    id={roleId}
                                                    className="w-full h-10 rounded-none border-0 border-b bg-transparent border-endurix-black/20 dark:border-white/15 dark:bg-white/[0.02] pl-3 pr-0 py-2 text-sm text-endurix-black dark:text-foreground focus:outline-none focus-visible:border-endurix-orange focus-visible:shadow-[0_4px_12px_rgba(255,104,0,0.08)] data-[placeholder]:text-endurix-black/30 dark:data-[placeholder]:text-white/30 [&>span]:line-clamp-1"
                                                >
                                                    <SelectValue
                                                        placeholder={t('form.rolePlaceholder')}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-card border-endurix-black/15 dark:border-white/10">
                                                    <SelectItem
                                                        value="head_coach"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('roles.head_coach')}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="assistant_coach"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('roles.assistant_coach')}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="other"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('roles.other')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Team size */}
                                        <div>
                                            <label
                                                htmlFor={teamSizeId}
                                                className="block text-[10px] font-bold text-endurix-black/70 dark:text-foreground/70 tracking-widest uppercase mb-2"
                                                style={{
                                                    fontFamily:
                                                        'var(--font-ibm-plex-mono, monospace)',
                                                }}
                                            >
                                                {t('form.teamSizeLabel')}
                                            </label>
                                            <Select
                                                value={values.teamSize}
                                                onValueChange={(v) => update('teamSize')(v)}
                                                disabled={status === 'submitting'}
                                            >
                                                <SelectTrigger
                                                    id={teamSizeId}
                                                    className="w-full h-10 rounded-none border-0 border-b bg-transparent border-endurix-black/20 dark:border-white/15 dark:bg-white/[0.02] pl-3 pr-0 py-2 text-sm text-endurix-black dark:text-foreground focus:outline-none focus-visible:border-endurix-orange focus-visible:shadow-[0_4px_12px_rgba(255,104,0,0.08)] data-[placeholder]:text-endurix-black/30 dark:data-[placeholder]:text-white/30 [&>span]:line-clamp-1"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'form.teamSizePlaceholder',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-card border-endurix-black/15 dark:border-white/10">
                                                    <SelectItem
                                                        value="1_5"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('teamSizes.1_5')}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="6_15"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('teamSizes.6_15')}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="16_30"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('teamSizes.16_30')}
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="30_plus"
                                                        className="text-endurix-black dark:text-foreground focus:bg-endurix-black/5 dark:focus:bg-white/5 focus:text-endurix-black dark:focus:text-foreground"
                                                    >
                                                        {t('teamSizes.30_plus')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <div
                                            role="alert"
                                            className="flex items-center gap-2 border-l-2 border-endurix-orange bg-endurix-orange/5 dark:bg-endurix-orange/10 px-3 py-2"
                                        >
                                            <span
                                                className="text-[11px] text-endurix-orange font-semibold tracking-wider uppercase"
                                                style={{
                                                    fontFamily:
                                                        'var(--font-ibm-plex-mono, monospace)',
                                                }}
                                            >
                                                {errorMessage}
                                            </span>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        variant="orange"
                                        size="lg"
                                        disabled={status === 'submitting'}
                                        className="w-full text-xs font-bold tracking-widest uppercase py-6 shadow-[0_8px_24px_-8px_rgba(255,104,0,0.5)] dark:shadow-[0_8px_32px_-8px_rgba(255,104,0,0.6)]"
                                        style={{
                                            fontFamily: 'var(--font-exo-2, sans-serif)',
                                        }}
                                    >
                                        {status === 'submitting'
                                            ? t('form.submitting')
                                            : t('form.submit')}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

function SuccessState({ title, detail }: { title: string; detail: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: easeOut }}
            className="py-10 text-center"
        >
            <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 220,
                    damping: 16,
                    delay: 0.05,
                }}
                className="mx-auto w-16 h-16 bg-endurix-orange flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(255,104,0,0.45)]"
            >
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </motion.div>

            <h3
                className="mt-6 font-bold text-endurix-black dark:text-foreground text-2xl lg:text-3xl uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {title}
            </h3>

            <p
                className="mt-3 text-sm text-endurix-black/70 dark:text-foreground/70 max-w-sm mx-auto leading-relaxed"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {detail}
            </p>
        </motion.div>
    );
}
