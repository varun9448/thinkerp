import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Smartphone, QrCode, Info, Save } from 'lucide-react';
import UpiQrCode from '../../Components/UpiQrCode';

interface UpiSettingsPageProps {
    upiSettings: {
        enabled: string;
        upi_id: string;
        upi_name: string;
    };
}

const UPI_APPS = [
    { name: 'PhonePe',    color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { name: 'Google Pay', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { name: 'Paytm',      color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { name: 'BHIM',       color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { name: 'Amazon Pay', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { name: 'Freecharge',  color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function UpiSettings() {
    const { t } = useTranslation();
    const { upiSettings } = usePage<UpiSettingsPageProps>().props;

    const [enabled, setEnabled] = useState(upiSettings.enabled === 'on');
    const [upiId, setUpiId]     = useState(upiSettings.upi_id ?? '');
    const [upiName, setUpiName] = useState(upiSettings.upi_name ?? '');
    const [saving, setSaving]   = useState(false);

    const handleSave = () => {
        setSaving(true);
        router.post(route('account.settings.upi.save'), {
            enabled:  enabled ? 'on' : 'off',
            upi_id:   upiId,
            upi_name: upiName,
        }, {
            onFinish: () => setSaving(false),
        });
    };

    const showPreview = enabled && upiId && upiName;

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Accounting'), href: route('account.index') },
                { label: t('UPI Settings') },
            ]}
            pageTitle={t('UPI Payment Settings')}
        >
            <Head title={t('UPI Settings')} />

            <div className="max-w-4xl mx-auto space-y-6">

                {/* Info banner */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">{t('How UPI payments work in this ERP')}</p>
                        <p>{t('When recording a customer payment and selecting UPI as the method, a QR code will be displayed that your customer can scan using any UPI app (PhonePe, Google Pay, Paytm, BHIM, etc.). After payment, enter the UTR / transaction ID in the Reference field for your records.')}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Settings form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Smartphone className="h-4 w-4" />
                                {t('UPI Configuration')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-semibold">{t('Enable UPI Payments')}</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t('Show UPI QR code when recording customer payments')}
                                    </p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="upi_id" required={enabled}>
                                        {t('UPI ID')}
                                    </Label>
                                    <Input
                                        id="upi_id"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="yourname@ybl"
                                        disabled={!enabled}
                                        className="mt-1 font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('Format: name@bankcode — e.g. business@ybl, company@oksbi, shop@paytm')}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="upi_name" required={enabled}>
                                        {t('Display Name')}
                                    </Label>
                                    <Input
                                        id="upi_name"
                                        value={upiName}
                                        onChange={(e) => setUpiName(e.target.value)}
                                        placeholder={t('Your Business Name')}
                                        disabled={!enabled}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('Shown to customer when they scan the QR code')}
                                    </p>
                                </div>
                            </div>

                            {/* Supported apps */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('Works with all UPI apps:')}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {UPI_APPS.map(app => (
                                        <span key={app.name} className={`text-xs border rounded px-2 py-0.5 font-medium ${app.color}`}>
                                            {app.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? t('Saving...') : t('Save UPI Settings')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Live QR preview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <QrCode className="h-4 w-4" />
                                {t('QR Preview')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center min-h-64">
                            {showPreview ? (
                                <div className="space-y-3 w-full flex flex-col items-center">
                                    <UpiQrCode
                                        upiId={upiId}
                                        payeeName={upiName}
                                        note={t('Sample payment')}
                                        size={200}
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                        {t('This is how the QR code will appear to your staff when recording a UPI payment.')}
                                    </p>
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                        {t('UPI payments active')}
                                    </Badge>
                                </div>
                            ) : (
                                <div className="text-center space-y-2 text-muted-foreground">
                                    <QrCode className="h-12 w-12 mx-auto opacity-25" />
                                    <p className="text-sm">{t('Enable UPI and fill in your UPI ID to see the QR preview.')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Common UPI bank codes reference */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{t('Common UPI Bank Codes Reference')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {[
                                ['@ybl', 'PhonePe / Yes Bank'],
                                ['@oksbi', 'Google Pay / SBI'],
                                ['@okaxis', 'Google Pay / Axis'],
                                ['@okhdfcbank', 'Google Pay / HDFC'],
                                ['@paytm', 'Paytm'],
                                ['@apl', 'Amazon Pay'],
                                ['@upi', 'BHIM / Multiple Banks'],
                                ['@icici', 'ICICI Bank'],
                                ['@kotak', 'Kotak Bank'],
                                ['@axisbank', 'Axis Bank'],
                                ['@hdfcbank', 'HDFC Bank'],
                                ['@ibl', 'IndusInd Bank'],
                            ].map(([code, bank]) => (
                                <div key={code} className="flex flex-col bg-gray-50 rounded p-2">
                                    <span className="font-mono text-green-700 font-semibold">{code}</span>
                                    <span className="text-muted-foreground">{bank}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
