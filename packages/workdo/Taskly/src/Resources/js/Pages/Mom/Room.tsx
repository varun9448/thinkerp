import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    AlertCircle, Users, FileText, Upload, Send, Lock, RefreshCw,
    Eye, Download, EyeOff, ChevronDown, ChevronUp, UserPlus, UserMinus, Plus, Archive, Pencil
} from 'lucide-react';
import StatementNode, { StatementData } from './Components/StatementNode';
import AiSuggestionPopup from './Components/AiSuggestionPopup';
import { formatFileSize } from '@/utils/helpers';

interface Document {
    id: number;
    original_name: string;
    description: string | null;
    file_size: number;
    mime_type: string | null;
    access_level: string | null;
    uploader_source: string;
    uploader_name: string;
    version: number;
    created_at: string;
    effective_access: string;
}

interface Member { id: number; name: string; type: string; }
interface EligibleUser { id: number; name: string; email: string; type: string; }

interface RoomProps {
    room: {
        id: number; name: string; description: string; status: string;
        project: { id: number; name: string };
    };
    statements: StatementData[];
    documents: Document[];
    members: Member[];
    eligibleUsers: EligibleUser[];
    pendingAckCount: number;
    isInternal: boolean;
    canManage: boolean;
    ackTypes: Record<string, string>;
    auth: { user: { id: number; name: string } };
}

const ACCESS_ICONS: Record<string, React.ReactNode> = {
    view_only:    <Eye className="h-3.5 w-3.5" />,
    downloadable: <Download className="h-3.5 w-3.5" />,
    disabled:     <EyeOff className="h-3.5 w-3.5" />,
};
const ACCESS_COLORS: Record<string, string> = {
    view_only:    'bg-blue-100 text-blue-700',
    downloadable: 'bg-green-100 text-green-700',
    disabled:     'bg-red-100 text-red-700',
};

export default function MomRoom() {
    const { t } = useTranslation();
    const { room, statements, documents, members, eligibleUsers, pendingAckCount, isInternal, canManage, ackTypes, auth } = usePage<RoomProps>().props;

    const [content, setContent] = useState('');
    const [replyTo, setReplyTo] = useState<StatementData | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [aiTarget, setAiTarget] = useState<StatementData | null>(null);
    const [rightTab, setRightTab] = useState<'documents' | 'members'>('documents');
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({ description: '', access_level: 'downloadable' });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const statementEndRef = useRef<HTMLDivElement>(null);

    // Edit room modal state
    const [showEditRoom, setShowEditRoom] = useState(false);
    const [editForm, setEditForm] = useState({ name: room.name, description: room.description });
    const [editSaving, setEditSaving] = useState(false);

    // Remove member confirmation state
    const [removeMemberTarget, setRemoveMemberTarget] = useState<Member | null>(null);

    useEffect(() => {
        statementEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [statements.length]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['statements', 'pendingAckCount', 'documents'] });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSend = () => {
        if (!content.trim()) return;
        setSubmitting(true);
        router.post(route('mom.statements.store', room.id), {
            content,
            parent_id: replyTo?.id ?? null,
        }, {
            onFinish: () => { setSubmitting(false); setContent(''); setReplyTo(null); },
        });
    };

    const handleAiApply = (text: string) => {
        setContent(text);
        if (aiTarget) setReplyTo(aiTarget);
        setAiTarget(null);
    };

    const handleUpload = () => {
        if (!uploadFile) return;
        const data = new FormData();
        data.append('file', uploadFile);
        data.append('description', uploadForm.description);
        if (isInternal) data.append('access_level', uploadForm.access_level);
        router.post(route('mom.documents.store', room.id), data as any, {
            onFinish: () => { setShowUpload(false); setUploadFile(null); setUploadForm({ description: '', access_level: 'downloadable' }); },
        });
    };

    const handleAccessChange = (docId: number, level: string) => {
        router.patch(route('mom.documents.access', docId), { access_level: level });
    };

    const handleAddMember = () => {
        if (!selectedMemberId) return;
        router.post(route('mom.rooms.members.add', room.id), { user_id: parseInt(selectedMemberId) }, {
            onFinish: () => { setShowAddMember(false); setSelectedMemberId(''); },
        });
    };

    const handleRemoveMember = () => {
        if (!removeMemberTarget) return;
        router.delete(route('mom.rooms.members.remove', room.id), {
            data: { user_id: removeMemberTarget.id },
            onFinish: () => setRemoveMemberTarget(null),
        });
    };

    const handleEditRoom = () => {
        if (!editForm.name.trim() || !editForm.description.trim()) return;
        setEditSaving(true);
        router.patch(route('mom.rooms.update', room.id), editForm, {
            onFinish: () => { setEditSaving(false); setShowEditRoom(false); },
        });
    };

    const isArchived = room.status === 'archived';

    const toggleRoom = () => {
        const routeName = room.status === 'active' ? 'mom.rooms.close' : 'mom.rooms.reopen';
        router.patch(route(routeName, room.id));
    };

    const handleArchive = () => {
        if (!confirm(t('Archive this room? It will become read-only permanently as an official record. This cannot be undone.'))) return;
        router.patch(route('mom.rooms.archive', room.id));
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Projects'), href: route('project.index') },
                { label: room.project.name, href: route('mom.rooms.index', room.project.id) },
                { label: room.name },
            ]}
            pageTitle={room.name}
        >
            <Head title={room.name} />

            <div className="flex flex-col h-[calc(100vh-9rem)]">

                {/* Archived banner */}
                {isArchived && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3 flex items-start gap-3">
                        <Archive className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">{t('This room is archived')}</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                {t('All activities in this room are permanently disabled. The content below is maintained as an official proof of record and cannot be modified.')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Top bar */}
                <div className="bg-white border rounded-lg p-3 mb-3 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-bold text-base">{room.name}</h2>
                            {room.status === 'active' && <Badge className="bg-green-100 text-green-800">{t('Active')}</Badge>}
                            {room.status === 'closed' && <Badge className="bg-gray-100 text-gray-600"><Lock className="h-3 w-3 inline mr-1" />{t('Closed')}</Badge>}
                            {room.status === 'archived' && <Badge className="bg-amber-100 text-amber-700"><Archive className="h-3 w-3 inline mr-1" />{t('Archived')}</Badge>}
                            {pendingAckCount > 0 && !isArchived && (
                                <Badge className="bg-red-100 text-red-700 font-semibold animate-pulse">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                    {pendingAckCount} {t('statement(s) awaiting your acknowledgment')}
                                </Badge>
                            )}
                        </div>
                        <button
                            className="text-xs text-muted-foreground hover:underline mt-0.5 text-left"
                            onClick={() => setShowDescription(v => !v)}
                        >
                            {showDescription ? t('Hide context') : t('Show room context')}
                        </button>
                        {showDescription && (
                            <p className="text-xs text-muted-foreground mt-1 bg-gray-50 rounded p-2">{room.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.reload({ only: ['statements', 'pendingAckCount'] })}>
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && !isArchived && (
                            <>
                                {room.status === 'active' && (
                                    <Button size="sm" variant="outline" onClick={() => { setEditForm({ name: room.name, description: room.description }); setShowEditRoom(true); }}>
                                        <Pencil className="h-3.5 w-3.5 mr-1" />{t('Edit')}
                                    </Button>
                                )}
                                <Button size="sm" variant={room.status === 'active' ? 'destructive' : 'outline'} onClick={toggleRoom}>
                                    {room.status === 'active' ? <><Lock className="h-3.5 w-3.5 mr-1" />{t('Close Room')}</> : t('Reopen Room')}
                                </Button>
                                <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50" onClick={handleArchive}>
                                    <Archive className="h-3.5 w-3.5 mr-1" /> {t('Archive')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-1 gap-3 min-h-0">

                    {/* Left: Statement thread */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white border rounded-lg">
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {statements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <p className="text-sm">{t('No statements yet. Be the first to open the discussion.')}</p>
                                </div>
                            ) : (
                                statements.map(s => (
                                    <StatementNode
                                        key={s.id}
                                        statement={s}
                                        isInternal={isInternal}
                                        currentUserId={auth.user.id}
                                        roomStatus={room.status}
                                        ackTypes={ackTypes}
                                        onReply={setReplyTo}
                                        onAiClick={setAiTarget}
                                        depth={0}
                                    />
                                ))
                            )}
                            <div ref={statementEndRef} />
                        </div>

                        {/* Input area */}
                        {room.status === 'active' ? (
                            <div className="border-t p-3 space-y-2">
                                {replyTo && (
                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                                        <span className="text-blue-600 font-medium">{t('Replying to')} #{replyTo.sl_no}</span>
                                        <span className="text-muted-foreground truncate">{replyTo.content.substring(0, 80)}...</span>
                                        <button onClick={() => setReplyTo(null)} className="ml-auto text-blue-500 hover:text-blue-700 shrink-0">✕</button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder={replyTo ? t('Type your reply...') : t('Type a new statement...')}
                                        rows={2}
                                        className="flex-1 resize-none text-sm"
                                        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
                                    />
                                    <Button onClick={handleSend} disabled={!content.trim() || submitting} className="self-end">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('Ctrl+Enter to send. Statements are permanent and cannot be edited.')}</p>
                            </div>
                        ) : (
                            <div className="border-t p-3 text-center text-sm text-muted-foreground">
                                {isArchived
                                    ? <><Archive className="h-4 w-4 inline mr-1" /> {t('This room is archived. Content is preserved as a read-only record.')}</>
                                    : <><Lock className="h-4 w-4 inline mr-1" /> {t('This room is closed. No new statements can be posted.')}</>
                                }
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="w-72 flex flex-col bg-white border rounded-lg min-h-0">
                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setRightTab('documents')}
                                className={`flex-1 text-xs py-2 font-medium flex items-center justify-center gap-1 ${rightTab === 'documents' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-muted-foreground'}`}
                            >
                                <FileText className="h-3.5 w-3.5" /> {t('Documents')} ({documents.length})
                            </button>
                            <button
                                onClick={() => setRightTab('members')}
                                className={`flex-1 text-xs py-2 font-medium flex items-center justify-center gap-1 ${rightTab === 'members' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-muted-foreground'}`}
                            >
                                <Users className="h-3.5 w-3.5" /> {t('Members')} ({members.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {/* Documents tab */}
                            {rightTab === 'documents' && (
                                <>
                                    {room.status === 'active' && (
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowUpload(v => !v)}>
                                            <Upload className="h-3.5 w-3.5 mr-1" /> {t('Upload Document')}
                                        </Button>
                                    )}

                                    {showUpload && (
                                        <div className="space-y-2 bg-gray-50 border rounded p-2">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                                            />
                                            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                                                {uploadFile ? uploadFile.name : t('Choose file...')}
                                            </Button>
                                            <Input
                                                value={uploadForm.description}
                                                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder={t('Description (optional)')}
                                                className="text-xs h-7"
                                            />
                                            {isInternal && (
                                                <Select value={uploadForm.access_level} onValueChange={v => setUploadForm(f => ({ ...f, access_level: v }))}>
                                                    <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="downloadable">{t('Downloadable')}</SelectItem>
                                                        <SelectItem value="view_only">{t('View Only')}</SelectItem>
                                                        <SelectItem value="disabled">{t('Disabled')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <div className="flex gap-1">
                                                <Button size="sm" className="flex-1 h-7 text-xs" disabled={!uploadFile} onClick={handleUpload}>
                                                    {t('Upload')}
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowUpload(false); setUploadFile(null); }}>
                                                    {t('Cancel')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {documents.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">{t('No documents yet.')}</p>
                                    ) : (
                                        documents.map(doc => (
                                            <div key={doc.id} className="border rounded p-2 space-y-1.5 text-xs">
                                                <div className="flex items-start gap-1">
                                                    <span className="font-medium truncate flex-1">{doc.original_name}</span>
                                                    {doc.version > 1 && <Badge className="text-xs bg-gray-100 shrink-0">v{doc.version}</Badge>}
                                                </div>
                                                {doc.description && <p className="text-muted-foreground">{doc.description}</p>}
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                                                    <span className="text-muted-foreground">·</span>
                                                    <span className="text-muted-foreground">{doc.uploader_name}</span>
                                                    {doc.uploader_source === 'client' ? (
                                                        <Badge className="text-xs bg-orange-100 text-orange-700">Client</Badge>
                                                    ) : doc.access_level && (
                                                        <Badge className={`text-xs flex items-center gap-1 ${ACCESS_COLORS[doc.access_level] ?? ''}`}>
                                                            {ACCESS_ICONS[doc.access_level]}
                                                            {doc.access_level.replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Access level control for internal users */}
                                                {isInternal && doc.uploader_source === 'internal' && (
                                                    <Select value={doc.access_level ?? 'downloadable'} onValueChange={v => handleAccessChange(doc.id, v)}>
                                                        <SelectTrigger className="h-6 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="downloadable">{t('Downloadable')}</SelectItem>
                                                            <SelectItem value="view_only">{t('View Only')}</SelectItem>
                                                            <SelectItem value="disabled">{t('Disabled')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}

                                                {/* View / Download button */}
                                                {doc.effective_access !== 'disabled' && (
                                                    <a
                                                        href={route('mom.documents.serve', doc.id)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                                                    >
                                                        {doc.effective_access === 'view_only' ? <Eye className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                                                        {doc.effective_access === 'view_only' ? t('View') : t('Download')}
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </>
                            )}

                            {/* Members tab */}
                            {rightTab === 'members' && (
                                <>
                                    {canManage && !isArchived && (
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowAddMember(v => !v)}>
                                            <UserPlus className="h-3.5 w-3.5 mr-1" /> {t('Add Member')}
                                        </Button>
                                    )}

                                    {showAddMember && eligibleUsers.length > 0 && (
                                        <div className="space-y-1.5 bg-gray-50 border rounded p-2">
                                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder={t('Select user...')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {eligibleUsers.map(u => (
                                                        <SelectItem key={u.id} value={String(u.id)}>
                                                            {u.name} ({u.type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" className="w-full h-7 text-xs" disabled={!selectedMemberId} onClick={handleAddMember}>
                                                {t('Add')}
                                            </Button>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        {members.map(m => (
                                            <div key={m.id} className="flex items-center gap-2 p-1.5 rounded border text-xs">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium truncate block">{m.name}</span>
                                                    <Badge className={`text-xs mt-0.5 ${m.type === 'client' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {m.type}
                                                    </Badge>
                                                </div>
                                                {canManage && m.id !== auth.user.id && (
                                                    <button onClick={() => setRemoveMemberTarget(m)} className="text-red-400 hover:text-red-600 shrink-0">
                                                        <UserMinus className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Suggestion Popup */}
            {aiTarget && (
                <AiSuggestionPopup
                    statement={aiTarget}
                    roomId={room.id}
                    onApply={handleAiApply}
                    onClose={() => setAiTarget(null)}
                />
            )}

            {/* Edit Room Dialog */}
            <Dialog open={showEditRoom} onOpenChange={setShowEditRoom}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Room')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="edit_room_name" required>{t('Room Name')}</Label>
                            <Input
                                id="edit_room_name"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit_room_desc" required>{t('Description / Context')}</Label>
                            <Textarea
                                id="edit_room_desc"
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                rows={4}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditRoom(false)}>{t('Cancel')}</Button>
                        <Button onClick={handleEditRoom} disabled={editSaving || !editForm.name.trim() || !editForm.description.trim()}>
                            {editSaving ? t('Saving...') : t('Save Changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Member Confirmation */}
            <ConfirmationDialog
                open={!!removeMemberTarget}
                onOpenChange={(open) => { if (!open) setRemoveMemberTarget(null); }}
                title={t('Remove Member')}
                message={t('Are you sure you want to remove {{name}} from this room?', { name: removeMemberTarget?.name ?? '' })}
                confirmText={t('Remove')}
                onConfirm={handleRemoveMember}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}
