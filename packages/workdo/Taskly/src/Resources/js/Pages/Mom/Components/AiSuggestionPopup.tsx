import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bot, X, Loader2, Check, RefreshCw } from 'lucide-react';
import { StatementData } from './StatementNode';

interface Suggestion {
    tone: string;
    text: string;
}

interface Props {
    statement: StatementData;
    roomId: number;
    onApply: (text: string) => void;
    onClose: () => void;
}

export default function AiSuggestionPopup({ statement, roomId, onApply, onClose }: Props) {
    const { t } = useTranslation();
    const [toneInput, setToneInput] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [applied, setApplied] = useState<number | null>(null);

    const fetchSuggestions = async () => {
        setLoading(true);
        setError('');
        setSuggestions([]);
        setApplied(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

            const res = await fetch(route('mom.ai.suggest', roomId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    statement_id: statement.id,
                    tone_input: toneInput,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? t('AI request failed.'));
                return;
            }

            setSuggestions(data.suggestions ?? []);
            if (!data.suggestions?.length) {
                setError(t('AI returned no suggestions. Try adjusting your tone input.'));
            }
        } catch {
            setError(t('Network error. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleApply = (index: number, text: string) => {
        setApplied(index);
        onApply(text);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-purple-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-purple-800">{t('AI Reply Assistant')}</span>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">{t('Internal Only')}</Badge>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Client statement being replied to */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-orange-700 mb-1">
                            {t('Client statement')} #{statement.sl_no} — {statement.user.name}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{statement.content}</p>
                    </div>

                    {/* Tone input */}
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">
                            {t('How should we sound the reply?')}
                            <span className="text-xs text-muted-foreground ml-1">({t('optional — leave blank for balanced professional tone')})</span>
                        </Label>
                        <Textarea
                            value={toneInput}
                            onChange={e => setToneInput(e.target.value)}
                            placeholder={t('e.g. Firm but understanding, acknowledge their concern but hold our position...')}
                            rows={2}
                            className="text-sm"
                        />
                    </div>

                    {/* Generate button */}
                    <Button
                        onClick={fetchSuggestions}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        {loading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('Analysing conversation...')}</>
                        ) : suggestions.length > 0 ? (
                            <><RefreshCw className="h-4 w-4 mr-2" /> {t('Regenerate Suggestions')}</>
                        ) : (
                            <><Bot className="h-4 w-4 mr-2" /> {t('Get AI Suggestions')}</>
                        )}
                    </Button>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('Suggested Replies — choose one to apply')}
                            </p>
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    className={`border rounded-lg p-3 space-y-2 transition-colors ${applied === i ? 'border-green-400 bg-green-50' : 'hover:border-purple-300'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-purple-100 text-purple-700 text-xs">{s.tone}</Badge>
                                        {applied === i ? (
                                            <span className="text-xs text-green-600 flex items-center gap-1">
                                                <Check className="h-3 w-3" /> {t('Applied')}
                                            </span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                                                onClick={() => handleApply(i, s.text)}
                                            >
                                                {t('Apply')}
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t bg-gray-50 rounded-b-xl">
                    <p className="text-xs text-muted-foreground text-center">
                        {t('AI suggestions are for your internal use only. Clients cannot see this assistant.')}
                    </p>
                </div>
            </div>
        </div>
    );
}
