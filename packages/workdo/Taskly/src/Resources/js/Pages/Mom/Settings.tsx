import { useState, useEffect } from 'react';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle, Eye, EyeOff, Save } from 'lucide-react';

interface ProviderModels { label: string; models: Record<string, string>; }
interface Config {
    provider: string;
    model: string;
    has_key: boolean;
    providers: Record<string, ProviderModels>;
}

export default function MomSettings() {
    const { t } = useTranslation();

    const [config, setConfig] = useState<Config | null>(null);
    const [provider, setProvider] = useState('anthropic');
    const [model, setModel] = useState('claude-sonnet-4-6');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(route('mom.ai.config'), { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(data => {
                setConfig(data);
                setProvider(data.provider ?? 'anthropic');
                setModel(data.model ?? 'claude-sonnet-4-6');
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const availableModels = config?.providers[provider]?.models ?? {};

    const handleProviderChange = (p: string) => {
        setProvider(p);
        const firstModel = Object.keys(config?.providers[p]?.models ?? {})[0] ?? '';
        setModel(firstModel);
    };

    const handleSave = () => {
        if (!apiKey.trim() && !config?.has_key) {
            setError(t('API key is required.'));
            return;
        }
        setSaving(true);
        setError('');
        router.post(route('mom.ai.config.save'), { provider, api_key: apiKey || '___unchanged___', model }, {
            onFinish: () => setSaving(false),
            onError: errs => setError(Object.values(errs).join(' ')),
        });
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('Project Setup'), href: route('project.task-stages.index') }, { label: t('MOM AI Settings') }]}
            pageTitle={t('MOM AI Settings')}
        >
            <Head title={t('MOM AI Settings')} />

            <div className="max-w-2xl space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-purple-600" />
                            <CardTitle className="text-base">{t('AI Provider Configuration')}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('Configure which AI model powers the reply assistant in MOM rooms. This is visible only to your internal team — clients never see AI suggestions.')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">{t('Loading...')}</p>
                        ) : (
                            <>
                                {config?.has_key && (
                                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                                        <CheckCircle className="h-4 w-4" />
                                        {t('AI is currently configured and active.')}
                                        <Badge className="ml-auto bg-purple-100 text-purple-700">{config.provider} / {config.model}</Badge>
                                    </div>
                                )}

                                {/* Provider */}
                                <div className="space-y-1.5">
                                    <Label>{t('AI Provider')}</Label>
                                    <Select value={provider} onValueChange={handleProviderChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(config?.providers ?? {}).map(([key, prov]) => (
                                                <SelectItem key={key} value={key}>{prov.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Model */}
                                <div className="space-y-1.5">
                                    <Label>{t('Model')}</Label>
                                    <Select value={model} onValueChange={setModel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(availableModels).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* API Key */}
                                <div className="space-y-1.5">
                                    <Label>{t('API Key')}</Label>
                                    <div className="relative">
                                        <Input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={e => setApiKey(e.target.value)}
                                            placeholder={config?.has_key ? t('Leave blank to keep existing key') : t('Enter your API key...')}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {provider === 'anthropic' && t('Get your key from console.anthropic.com')}
                                        {provider === 'openai' && t('Get your key from platform.openai.com/api-keys')}
                                        {provider === 'google' && t('Get your key from aistudio.google.com')}
                                    </p>
                                </div>

                                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

                                <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? t('Saving...') : t('Save Configuration')}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-4">
                        <h4 className="text-sm font-semibold text-amber-800 mb-2">{t('How AI Assist Works')}</h4>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                            <li>{t('When a client posts a statement, your team sees an "AI Assist" button on it.')}</li>
                            <li>{t('Click it to open a popup — enter the tone/approach you want.')}</li>
                            <li>{t('AI analyses the full room conversation history and documents context.')}</li>
                            <li>{t('3 reply options are generated. Click "Apply" on the one you like.')}</li>
                            <li>{t('The reply is filled into the input box for you to review before sending.')}</li>
                            <li>{t('Clients never see any AI options or indicators in their view.')}</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
