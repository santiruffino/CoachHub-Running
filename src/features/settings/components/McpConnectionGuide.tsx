'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Plug, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface McpConnectionGuideProps {
    /** Absolute URL of the MCP endpoint, e.g. https://endurix.app/api/mcp */
    endpoint: string;
}

/**
 * Read-only guide that shows a coach/admin how to connect an MCP client
 * (Claude Desktop and compatibles) to Endurix. Purely instructional — it copies
 * the endpoint and a ready-to-paste client config, and lists what the server can do.
 */
export function McpConnectionGuide({ endpoint }: McpConnectionGuideProps) {
    const t = useTranslations('settings.mcp');
    const [copied, setCopied] = useState<'endpoint' | 'config' | null>(null);

    const configJson = JSON.stringify(
        {
            mcpServers: {
                endurix: {
                    command: 'npx',
                    args: ['-y', 'mcp-remote', endpoint],
                },
            },
        },
        null,
        2,
    );

    const copy = async (value: string, key: 'endpoint' | 'config') => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // Clipboard can be blocked (e.g. insecure context); silently ignore.
        }
    };

    const toolKeys = ['consult', 'templates', 'plans', 'assign', 'groupsRaces', 'notify'] as const;

    return (
        <div className="space-y-6">
            {/* Endpoint */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Plug className="h-4 w-4 text-endurix-orange" />
                        {t('endpoint.label')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto whitespace-nowrap border border-endurix-black/10 dark:border-border bg-endurix-black/5 dark:bg-white/5 px-3 py-2 text-sm">
                            {endpoint}
                        </code>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy(endpoint, 'endpoint')}
                        >
                            {copied === 'endpoint' ? (
                                <>
                                    <Check className="h-4 w-4 mr-1 text-emerald-600" />
                                    {t('endpoint.copied')}
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    {t('endpoint.copy')}
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('endpoint.hint')}</p>
                </CardContent>
            </Card>

            {/* Setup */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Wrench className="h-4 w-4 text-endurix-orange" />
                        {t('setup.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t('setup.intro')}</p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {t('setup.configLabel')}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => copy(configJson, 'config')}
                            >
                                {copied === 'config' ? (
                                    <>
                                        <Check className="h-4 w-4 mr-1 text-emerald-600" />
                                        {t('endpoint.copied')}
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4 mr-1" />
                                        {t('endpoint.copy')}
                                    </>
                                )}
                            </Button>
                        </div>
                        <pre className="overflow-x-auto border border-endurix-black/10 dark:border-border bg-endurix-black/5 dark:bg-white/5 p-3 text-xs leading-relaxed">
                            <code>{configJson}</code>
                        </pre>
                    </div>

                    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>{t('setup.step1')}</li>
                        <li>{t('setup.step2')}</li>
                        <li>{t('setup.step3')}</li>
                    </ol>
                </CardContent>
            </Card>

            {/* Auth & limits */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-endurix-orange" />
                        {t('auth.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('auth.session')}</p>
                    <p>{t('auth.rate')}</p>
                </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('tools.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {toolKeys.map((key) => (
                            <li key={key} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-endurix-orange" />
                                {t(`tools.${key}`)}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
