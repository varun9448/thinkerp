import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePicker } from '@/components/ui/date-picker';
import InputError from '@/components/ui/input-error';
import { Trash2 } from 'lucide-react';
import { CreateCustomerPaymentFormData, CreateCustomerPaymentProps, SalesInvoice, CreditNote } from './types';
import { formatCurrency } from '@/utils/helpers';
import UpiQrCode from '../../Components/UpiQrCode';

export default function Create({ customers, bankAccounts, paymentMethods, upiSettings, onSuccess }: CreateCustomerPaymentProps) {
    const { t } = useTranslation();
    const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoice[]>([]);
    const [availableCreditNotes, setAvailableCreditNotes] = useState<CreditNote[]>([]);
    const [selectedAllocations, setSelectedAllocations] = useState<{invoice_id: number; amount: number}[]>([]);
    const [selectedCreditNotes, setSelectedCreditNotes] = useState<{credit_note_id: number; amount: number}[]>([]);

    const { data, setData, post, processing, errors } = useForm<CreateCustomerPaymentFormData>({
        payment_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        bank_account_id: '',
        payment_method: 'other',
        reference_number: '',
        payment_amount: '',
        notes: '',
        allocations: [],
        credit_notes: []
    });

    useEffect(() => { setData('allocations', selectedAllocations); }, [selectedAllocations]);
    useEffect(() => { setData('credit_notes', selectedCreditNotes); }, [selectedCreditNotes]);

    const fetchOutstandingInvoices = async (customerId: string) => {
        if (!customerId) { setOutstandingInvoices([]); setAvailableCreditNotes([]); return; }
        try {
            const response = await fetch(route('account.customer-payments.outstanding-invoices', customerId));
            const result = await response.json();
            setOutstandingInvoices(result.invoices || result || []);
            setAvailableCreditNotes(result.creditNotes || []);
        } catch {
            setOutstandingInvoices([]);
            setAvailableCreditNotes([]);
        }
    };

    useEffect(() => {
        if (data.customer_id) {
            fetchOutstandingInvoices(data.customer_id);
        } else {
            setOutstandingInvoices([]);
            setAvailableCreditNotes([]);
        }
        setSelectedAllocations([]);
        setSelectedCreditNotes([]);
        setData('payment_amount', '');
    }, [data.customer_id]);

    const addAllocation = (invoice: SalesInvoice) => {
        if (selectedAllocations.find(a => a.invoice_id === invoice.id)) return;
        const newAllocations = [...selectedAllocations, { invoice_id: invoice.id, amount: invoice.balance_amount }];
        setSelectedAllocations(newAllocations);
        updateTotalAmount(newAllocations, selectedCreditNotes);
    };

    const removeAllocation = (invoiceId: number) => {
        const newAllocations = selectedAllocations.filter(a => a.invoice_id !== invoiceId);
        setSelectedAllocations(newAllocations);
        updateTotalAmount(newAllocations, selectedCreditNotes);
    };

    const updateAllocationAmount = (invoiceId: number, amount: number) => {
        const newAllocations = selectedAllocations.map(a => a.invoice_id === invoiceId ? { ...a, amount: Number(amount || 0) } : a);
        setSelectedAllocations(newAllocations);
        updateTotalAmount(newAllocations, selectedCreditNotes);
    };

    const updateTotalAmount = (allocations: {invoice_id: number; amount: number}[], creditNotes = selectedCreditNotes) => {
        const allocationsTotal = allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const creditNotesTotal = creditNotes.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        setData('payment_amount', Number(Math.max(0, allocationsTotal - creditNotesTotal)).toFixed(2));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('account.customer-payments.store'), { onSuccess });
    };

    const getInvoiceById = (id: number) => outstandingInvoices.find(inv => inv.id === id);

    const isUpi = data.payment_method === 'upi';
    const showUpiQr = isUpi && upiSettings.enabled && upiSettings.upi_id;

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('Create Customer Payment')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="payment_date" required>{t('Payment Date')}</Label>
                        <DatePicker
                            id="payment_date"
                            value={data.payment_date}
                            onChange={(value) => setData('payment_date', value instanceof Date ? value.toISOString().split('T')[0] : value)}
                            placeholder={t('Select payment date')}
                            required
                        />
                        <InputError message={errors.payment_date} />
                    </div>

                    <div>
                        <Label htmlFor="customer_id" required>{t('Customer')}</Label>
                        <Select value={data.customer_id} onValueChange={(value) => setData('customer_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Customer')} />
                            </SelectTrigger>
                            <SelectContent>
                                {customers?.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.customer_id} />
                    </div>

                    <div>
                        <Label htmlFor="bank_account_id" required>{t('Bank Account')}</Label>
                        <Select value={data.bank_account_id} onValueChange={(value) => setData('bank_account_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Bank Account')} />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.account_name} ({account.account_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.bank_account_id} />
                    </div>

                    <div>
                        <Label htmlFor="payment_method" required>{t('Payment Method')}</Label>
                        <Select value={data.payment_method} onValueChange={(value) => setData('payment_method', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Payment Method')} />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(paymentMethods).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{t(label)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.payment_method} />
                    </div>

                    <div>
                        <Label htmlFor="reference_number">
                            {isUpi ? t('UTR / UPI Transaction ID') : t('Reference Number')}
                        </Label>
                        <Input
                            id="reference_number"
                            value={data.reference_number}
                            onChange={(e) => setData('reference_number', e.target.value)}
                            placeholder={isUpi ? t('Enter UTR or UPI transaction ID') : t('Cheque number, NEFT ref, etc.')}
                        />
                        <InputError message={errors.reference_number} />
                    </div>
                </div>

                {/* UPI QR Code section */}
                {showUpiQr && (
                    <div className="flex flex-col md:flex-row gap-4 items-start bg-green-50/50 border border-green-200 rounded-lg p-4">
                        <div className="shrink-0">
                            <UpiQrCode
                                upiId={upiSettings.upi_id}
                                payeeName={upiSettings.upi_name}
                                amount={data.payment_amount}
                                note={t('Payment')}
                                size={160}
                            />
                        </div>
                        <div className="flex-1 space-y-2 text-sm text-gray-600">
                            <p className="font-semibold text-green-800">{t('Show this QR code to your customer')}</p>
                            <p>{t('1. Customer scans the QR with any UPI app')}</p>
                            <p>{t('2. Customer completes the payment')}</p>
                            <p>{t('3. Enter the UTR / transaction ID in the Reference field above')}</p>
                            <div className="mt-3 bg-white border border-green-200 rounded p-2 text-xs">
                                <span className="font-semibold">{t('UPI ID')}: </span>
                                <span className="font-mono text-green-700">{upiSettings.upi_id}</span>
                            </div>
                        </div>
                    </div>
                )}

                {isUpi && !upiSettings.enabled && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                        {t('UPI QR code is not configured. Go to Accounting → UPI Settings to set up your UPI ID.')}
                    </p>
                )}

                {data.customer_id && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-sm">{t('Outstanding Invoices')}</CardTitle></CardHeader>
                            <CardContent>
                                {outstandingInvoices.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {outstandingInvoices.map((invoice) => (
                                            <div key={invoice.id} className="flex items-center justify-between p-2 border rounded">
                                                <div>
                                                    <span className="font-medium">{invoice.invoice_number}</span>
                                                    <span className="text-sm text-gray-500 ml-2">Balance: {formatCurrency(invoice.balance_amount)}</span>
                                                </div>
                                                <Button type="button" size="sm" onClick={() => addAllocation(invoice)}
                                                    disabled={selectedAllocations.some(a => a.invoice_id === invoice.id)}>
                                                    {t('Add')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 text-sm">{t('No outstanding invoices found for this customer')}</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="text-sm">{t('Available Credit Notes')}</CardTitle></CardHeader>
                            <CardContent>
                                {availableCreditNotes.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {availableCreditNotes.map((creditNote) => (
                                            <div key={creditNote.id} className="flex items-center justify-between p-2 border rounded">
                                                <div>
                                                    <span className="font-medium">{creditNote.credit_note_number}</span>
                                                    <span className="text-sm text-gray-500 ml-2">Balance: {formatCurrency(creditNote.balance_amount)}</span>
                                                </div>
                                                <Button type="button" size="sm" variant="outline"
                                                    onClick={() => {
                                                        const totalInvoice = selectedAllocations.reduce((s, a) => s + a.amount, 0);
                                                        const currentCN = selectedCreditNotes.reduce((s, c) => s + c.amount, 0);
                                                        const maxAmount = Math.min(creditNote.balance_amount, totalInvoice - currentCN);
                                                        const newCNs = [...selectedCreditNotes, { credit_note_id: creditNote.id, amount: maxAmount > 0 ? maxAmount : creditNote.balance_amount }];
                                                        setSelectedCreditNotes(newCNs);
                                                        updateTotalAmount(selectedAllocations, newCNs);
                                                    }}
                                                    disabled={selectedCreditNotes.some(c => c.credit_note_id === creditNote.id)}>
                                                    {t('Apply')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 text-sm">{t('No credit notes available for this customer')}</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {(selectedAllocations.length > 0 || selectedCreditNotes.length > 0) && (
                    <Card>
                        <CardHeader><CardTitle className="text-sm">{t('Payment Summary')}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {selectedAllocations.map((allocation) => {
                                    const invoice = getInvoiceById(allocation.invoice_id);
                                    return (
                                        <div key={allocation.invoice_id} className="flex items-center gap-3 p-3 border rounded">
                                            <div className="flex-1">
                                                <div className="font-medium">{invoice?.invoice_number}</div>
                                                <div className="text-sm text-gray-500">{t('Balance')}: {formatCurrency(invoice?.balance_amount || 0)}</div>
                                            </div>
                                            <div className="w-32">
                                                <Input type="number" step="0.01" value={allocation.amount}
                                                    onChange={(e) => updateAllocationAmount(allocation.invoice_id, Number(e.target.value) || 0)}
                                                    max={invoice?.balance_amount} />
                                            </div>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeAllocation(allocation.invoice_id)}>
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    );
                                })}
                                {selectedCreditNotes.map((creditNote, index) => {
                                    const note = availableCreditNotes.find(c => c.id === creditNote.credit_note_id);
                                    return (
                                        <div key={`credit-${index}`} className="flex items-center gap-3 p-3 border rounded bg-green-50">
                                            <div className="flex-1">
                                                <div className="font-medium text-green-700">{note?.credit_note_number}</div>
                                                <div className="text-sm text-gray-500">{t('Credit applied to payment')}</div>
                                            </div>
                                            <div className="w-32">
                                                <Input type="number" step="0.01" value={creditNote.amount}
                                                    onChange={(e) => {
                                                        const newAmount = Number(e.target.value);
                                                        if (isNaN(newAmount)) return;
                                                        const totalInvoice = selectedAllocations.reduce((s, a) => s + Number(a.amount || 0), 0);
                                                        const otherCN = selectedCreditNotes.reduce((s, c, i) => i !== index ? s + Number(c.amount || 0) : s, 0);
                                                        const maxAllowed = totalInvoice - otherCN;
                                                        const maxAmount = Math.min(note?.balance_amount || 0, maxAllowed);
                                                        const validAmount = Math.max(0, Math.min(newAmount, maxAmount));
                                                        const newCNs = selectedCreditNotes.map((c, i) => i === index ? { ...c, amount: validAmount } : c);
                                                        setSelectedCreditNotes(newCNs);
                                                        updateTotalAmount(selectedAllocations, newCNs);
                                                    }}
                                                    max={Math.min(availableCreditNotes.find(c => c.id === creditNote.credit_note_id)?.balance_amount || 0, selectedAllocations.reduce((s, a) => s + a.amount, 0))}
                                                    className="text-right" />
                                            </div>
                                            <Button type="button" variant="ghost" size="sm"
                                                onClick={() => { const newCNs = selectedCreditNotes.filter((_, i) => i !== index); setSelectedCreditNotes(newCNs); updateTotalAmount(selectedAllocations, newCNs); }}>
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div>
                    <CurrencyInput
                        label={t('Total Payment Amount')}
                        value={data.payment_amount}
                        onChange={(value) => {
                            setData('payment_amount', value);
                            if (parseFloat(value) !== selectedAllocations.reduce((s, a) => s + a.amount, 0)) {
                                setSelectedAllocations([]);
                            }
                        }}
                        error={errors.payment_amount}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Textarea id="notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)}
                        rows={3} placeholder={t('Enter notes')} />
                    <InputError message={errors.notes} />
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>{t('Cancel')}</Button>
                    <Button type="submit" disabled={processing || (!selectedAllocations.length && !selectedCreditNotes.length)}>
                        {processing ? t('Creating...') : t('Create')}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}
