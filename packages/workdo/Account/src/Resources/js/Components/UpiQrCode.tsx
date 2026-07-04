import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';

interface UpiQrCodeProps {
    upiId: string;
    payeeName: string;
    amount?: string | number;
    note?: string;
    size?: number;
}

const UPI_APPS = ['PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Amazon Pay'];

const APP_COLORS: Record<string, string> = {
    'PhonePe':    'bg-purple-50 text-purple-700 border-purple-200',
    'Google Pay': 'bg-blue-50 text-blue-700 border-blue-200',
    'Paytm':      'bg-indigo-50 text-indigo-700 border-indigo-200',
    'BHIM':       'bg-orange-50 text-orange-700 border-orange-200',
    'Amazon Pay': 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function UpiQrCode({ upiId, payeeName, amount, note, size = 180 }: UpiQrCodeProps) {
    const { t } = useTranslation();
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        if (!upiId) return;

        const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' });
        if (amount && Number(amount) > 0) params.set('am', String(Number(amount).toFixed(2)));
        if (note) params.set('tn', note.substring(0, 50));

        const upiUrl = `upi://pay?${params.toString()}`;

        QRCode.toDataURL(upiUrl, {
            width: size,
            margin: 2,
            color: { dark: '#1a1a1a', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        })
            .then(url => setQrDataUrl(url))
            .catch(() => setQrDataUrl(''));
    }, [upiId, payeeName, amount, note, size]);

    if (!qrDataUrl) return null;

    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-green-300 rounded-xl">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t('Pay via UPI')}</p>

            <img
                src={qrDataUrl}
                alt="UPI QR Code"
                style={{ width: size, height: size }}
                className="rounded-lg"
            />

            <div className="text-center space-y-0.5">
                <p className="text-sm font-bold text-gray-800">{payeeName}</p>
                <p className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    {upiId}
                </p>
            </div>

            {amount && Number(amount) > 0 && (
                <p className="text-sm font-semibold text-gray-700">
                    {t('Amount')}: <span className="text-green-700">₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </p>
            )}

            <div className="flex gap-1 flex-wrap justify-center mt-1">
                {UPI_APPS.map(app => (
                    <span key={app} className={`text-xs border rounded px-1.5 py-0.5 ${APP_COLORS[app]}`}>
                        {app}
                    </span>
                ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-1">
                {t('Scan with any UPI app and share the transaction ID')}
            </p>
        </div>
    );
}
