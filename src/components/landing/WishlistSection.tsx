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

    const update = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorCode(null);

        if (!values.name || !values.email || !values.role || !values.teamSize) {
            setStatus('error');
            setErrorCode('required');
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
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
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
                            className="font-bold text-endurix-black dark:text-foreground text-4xl lg:text-5xl xl:text-6xl leading-[1.05] tracking-tight uppercase"
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

                        <p className="mt-8 text-endurix-black/60 dark:text-muted-foreground text-base leading-relaxed max-w-md">
                            {t('subtitle')}
                        </p>

                        {/* Benefits */}
                        <div className="mt-10">
                            <span
                                className="block text-[10px] text-endurix-black/40 dark:text-muted-foreground tracking-widest mb-4"
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
                                            <span className="mt-0.5 w-7 h-7 border border-endurix-black/15 dark:border-border flex items-center justify-center shrink-0">
                                                <Icon
                                                    className="w-3.5 h-3.5 text-endurix-orange"
                                                    strokeWidth={1.75}
                                                />
                                            </span>
                                            <span className="text-sm text-endurix-black dark:text-foreground leading-relaxed">
                                                {benefit}
                                            </span>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Trust line */}
                        <p
                            className="mt-8 text-[10px] text-endurix-black/40 dark:text-muted-foreground tracking-widest uppercase flex items-center gap-2"
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
                        <div className="relative bg-white dark:bg-card border border-endurix-black/12 dark:border-border p-8 lg:p-10">
                            {/* Orange corner mark */}
                            <div className="absolute top-0 left-0 w-12 h-1 bg-endurix-orange" />

                            <div className="flex items-center justify-between mb-8">
                                <span
                                    className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest"
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
                                    {/* Name */}
                                    <div>
                                        <label
                                            htmlFor={nameId}
                                            className="block text-[10px] font-bold text-endurix-black/60 dark:text-muted-foreground tracking-widest uppercase mb-2"
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
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label
                                            htmlFor={emailId}
                                            className="block text-[10px] font-bold text-endurix-black/60 dark:text-muted-foreground tracking-widest uppercase mb-2"
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
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {/* Role */}
                                        <div>
                                            <label
                                                htmlFor={roleId}
                                                className="block text-[10px] font-bold text-endurix-black/60 dark:text-muted-foreground tracking-widest uppercase mb-2"
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
                                                <SelectTrigger id={roleId} className="w-full">
                                                    <SelectValue
                                                        placeholder={t('form.rolePlaceholder')}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="head_coach">
                                                        {t('roles.head_coach')}
                                                    </SelectItem>
                                                    <SelectItem value="assistant_coach">
                                                        {t('roles.assistant_coach')}
                                                    </SelectItem>
                                                    <SelectItem value="other">
                                                        {t('roles.other')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Team size */}
                                        <div>
                                            <label
                                                htmlFor={teamSizeId}
                                                className="block text-[10px] font-bold text-endurix-black/60 dark:text-muted-foreground tracking-widest uppercase mb-2"
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
                                                <SelectTrigger id={teamSizeId} className="w-full">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'form.teamSizePlaceholder',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1_5">
                                                        {t('teamSizes.1_5')}
                                                    </SelectItem>
                                                    <SelectItem value="6_15">
                                                        {t('teamSizes.6_15')}
                                                    </SelectItem>
                                                    <SelectItem value="16_30">
                                                        {t('teamSizes.16_30')}
                                                    </SelectItem>
                                                    <SelectItem value="30_plus">
                                                        {t('teamSizes.30_plus')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <p
                                            role="alert"
                                            className="text-[11px] text-endurix-orange font-semibold tracking-wider uppercase"
                                            style={{
                                                fontFamily:
                                                    'var(--font-ibm-plex-mono, monospace)',
                                            }}
                                        >
                                            {errorMessage}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        variant="orange"
                                        size="lg"
                                        disabled={status === 'submitting'}
                                        className="w-full text-xs font-bold tracking-widest uppercase py-6"
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
                className="mx-auto w-16 h-16 bg-endurix-orange flex items-center justify-center"
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
                className="mt-3 text-sm text-endurix-black/60 dark:text-muted-foreground max-w-sm mx-auto leading-relaxed"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {detail}
            </p>
        </motion.div>
    );
}
