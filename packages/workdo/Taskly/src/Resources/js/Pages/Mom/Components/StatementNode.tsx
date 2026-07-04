import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CornerDownRight, Bot, CheckCircle } from 'lucide-react';

export interface AckData {
    type: string;
    remarks: string | null;
}

export interface StatementData {
    id: number;
    parent_id: number | null;
    sl_no: string;
    content: string;
    user_id: number;
    user: { id: number; name: string; type: string };
    created_at: string;
    my_ack: AckData | null;
    all_acks: { user_name: string; type: string; remarks: string | null }[];
    children: StatementData[];
}

interface Props {
    statement: StatementData;
    isInternal: boolean;
    currentUserId: number;
    roomStatus: string;
    ackTypes: Record<string, string>;
    onReply: (statement: StatementData) => void;
    onAiClick: (statement: StatementData) => void;
    depth: number;
}

const ACK_COLORS: Record<string, string> = {
    agree:                  'bg-green-100 text-green-800',
    accepted:               'bg-green-100 text-green-800',
    rejected:               'bg-red-100 text-red-800',
    pending_decision:       'bg-yellow-100 text-yellow-800',
    accepted_with_remarks:  'bg-teal-100 text-teal-800',
    rejected_with_remarks:  'bg-orange-100 text-orange-800',
};

export default function StatementNode({ statement, isInternal, currentUserId, roomStatus, ackTypes, onReply, onAiClick, depth }: Props) {
    const { t } = useTranslation();
    const [showAckForm, setShowAckForm] = useState(false);
    const [showAllAcks, setShowAllAcks] = useState(false);
    const [ackType, setAckType] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isOwn       = statement.user_id === currentUserId;
    const isClient    = statement.user.type === 'client';
    const canAck      = !isOwn && !statement.my_ack && roomStatus === 'active';
    const needsRemarks = ['accepted_with_remarks', 'rejected_with_remarks'].includes(ackType);

    const submitAck = () => {
        if (!ackType) return;
        setSubmitting(true);
        router.post(route('mom.statements.acknowledge', statement.id), { type: ackType, remarks }, {
            onFinish: () => { setSubmitting(false); setShowAckForm(false); setAckType(''); setRemarks(''); },
        });
    };

    const indentClass = depth === 0 ? '' : 'ml-4 border-l-2 border-gray-200 pl-4';

    return (
        <div className={indentClass}>
            <div className={`rounded-lg p-3 mb-2 ${isOwn ? 'bg-blue-50 border border-blue-100' : isClient ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50 border border-gray-100'}`}>

                {/* Statement header */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-white border rounded px-1.5 py-0.5">
                        #{statement.sl_no}
                    </span>
                    <span className="text-xs font-semibold">{statement.user.name}</span>
                    <Badge className={isClient ? 'bg-orange-100 text-orange-700 text-xs' : 'bg-blue-100 text-blue-700 text-xs'}>
                        {statement.user.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{statement.created_at}</span>
                </div>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{statement.content}</p>

                {/* My ack badge */}
                {statement.my_ack && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <Badge className={`text-xs ${ACK_COLORS[statement.my_ack.type] ?? 'bg-gray-100'}`}>
                            {t('My ack')}: {ackTypes[statement.my_ack.type] ?? statement.my_ack.type}
                        </Badge>
                        {statement.my_ack.remarks && (
                            <span className="text-xs text-muted-foreground italic">"{statement.my_ack.remarks}"</span>
                        )}
                    </div>
                )}

                {/* All acks summary */}
                {statement.all_acks.length > 0 && (
                    <div className="mt-1">
                        <button
                            onClick={() => setShowAllAcks(v => !v)}
                            className="text-xs text-muted-foreground hover:underline"
                        >
                            {statement.all_acks.length} {t('acknowledgment(s)')} {showAllAcks ? '▲' : '▼'}
                        </button>
                        {showAllAcks && (
                            <div className="mt-1 space-y-1 pl-2">
                                {statement.all_acks.map((ack, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="font-medium">{ack.user_name}</span>
                                        <Badge className={`text-xs ${ACK_COLORS[ack.type] ?? 'bg-gray-100'}`}>
                                            {ackTypes[ack.type] ?? ack.type}
                                        </Badge>
                                        {ack.remarks && <span className="text-muted-foreground italic">"{ack.remarks}"</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                {roomStatus === 'active' && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Reply */}
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onReply(statement)}>
                            <CornerDownRight className="h-3 w-3 mr-1" /> {t('Reply')}
                        </Button>

                        {/* Acknowledge */}
                        {canAck && !showAckForm && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-amber-600" onClick={() => setShowAckForm(true)}>
                                <CheckCircle className="h-3 w-3 mr-1" /> {t('Acknowledge')}
                            </Button>
                        )}

                        {/* AI assist — only for internal users on client statements */}
                        {isInternal && isClient && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-purple-600" onClick={() => onAiClick(statement)}>
                                <Bot className="h-3 w-3 mr-1" /> {t('AI Assist')}
                            </Button>
                        )}
                    </div>
                )}

                {/* Ack form */}
                {showAckForm && (
                    <div className="mt-3 space-y-2 border-t pt-2">
                        <Select value={ackType} onValueChange={setAckType}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t('Select acknowledgment type')} />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ackTypes).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(needsRemarks || ackType === 'pending_decision') && (
                            <Textarea
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder={t('Remarks...')}
                                rows={2}
                                className="text-xs"
                            />
                        )}
                        <div className="flex gap-2">
                            <Button size="sm" disabled={!ackType || (needsRemarks && !remarks) || submitting} onClick={submitAck} className="h-7 text-xs">
                                {submitting ? t('Saving...') : t('Submit')}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowAckForm(false); setAckType(''); setRemarks(''); }}>
                                {t('Cancel')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Children */}
            {statement.children.map(child => (
                <StatementNode
                    key={child.id}
                    statement={child}
                    isInternal={isInternal}
                    currentUserId={currentUserId}
                    roomStatus={roomStatus}
                    ackTypes={ackTypes}
                    onReply={onReply}
                    onAiClick={onAiClick}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
}
