import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function FrontendDisabled() {
    const { t } = useTranslation();

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('Unavailable') }]}
            pageTitle={t('Unavailable')}
        >
            <Head title={t('Unavailable')} />

            <div className="rounded-md border bg-background p-6">
                <h2 className="text-lg font-semibold">{t('This module is not available')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('The requested module is not available in the current interface.')}
                </p>
                <Button className="mt-4" onClick={() => router.visit(route('dashboard'))}>
                    {t('Back to Dashboard')}
                </Button>
            </div>
        </AuthenticatedLayout>
    );
}
