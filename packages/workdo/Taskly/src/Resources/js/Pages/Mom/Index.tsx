import { useState } from 'react';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Users, FileText, AlertCircle, ChevronRight, Lock } from 'lucide-react';

interface Room {
    id: number;
    name: string;
    description: string;
    status: string;
    member_count: number;
    statement_count: number;
    pending_ack: number;
    unread: number;
    is_member: boolean;
    created_at: string;
}

interface EligibleUser {
    id: number;
    name: string;
    email: string;
    type: string;
}

interface IndexProps {
    project: { id: number; name: string };
    rooms: Room[];
    eligibleUsers: EligibleUser[];
    canManage: boolean;
}

export default function MomIndex() {
    const { t } = useTranslation();
    const { project, rooms, eligibleUsers, canManage } = usePage<IndexProps>().props;

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', member_ids: [] as number[] });
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = () => {
        if (!form.name.trim() || !form.description.trim()) return;
        setSubmitting(true);
        router.post(route('mom.rooms.store', project.id), form, {
            onFinish: () => { setSubmitting(false); setShowCreate(false); setForm({ name: '', description: '', member_ids: [] }); },
        });
    };

    const toggleMember = (id: number) => {
        setForm(f => ({
            ...f,
            member_ids: f.member_ids.includes(id)
                ? f.member_ids.filter(m => m !== id)
                : [...f.member_ids, id],
        }));
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Projects'), href: route('project.index') },
                { label: project.name },
                { label: t('MOM Rooms') },
            ]}
            pageTitle={t('Minutes of Meeting')}
        >
            <Head title={t('MOM — ') + project.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{project.name} — {t('MOM Rooms')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('Official discussion rooms for formal decisions and meeting minutes')}
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={() => setShowCreate(true)}>
                            <Plus className="h-4 w-4 mr-2" /> {t('New Room')}
                        </Button>
                    )}
                </div>

                {/* Create Room Form */}
                {showCreate && (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader>
                            <CardTitle className="text-base">{t('Create New MOM Room')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>{t('Room Name')} *</Label>
                                    <Input
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder={t('e.g. Budget Review Q2')}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Description')} * <span className="text-xs text-muted-foreground">({t('Used by AI for context')})</span></Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder={t('Describe the purpose, scope, and key topics of this room...')}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Member selection */}
                            <div className="space-y-2">
                                <Label>{t('Invite Members')}</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-white">
                                    {eligibleUsers.map(u => (
                                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={form.member_ids.includes(u.id)}
                                                onChange={() => toggleMember(u.id)}
                                                className="rounded"
                                            />
                                            <span className="truncate">{u.name}</span>
                                            <Badge className={u.type === 'client' ? 'bg-orange-100 text-orange-700 text-xs' : 'bg-blue-100 text-blue-700 text-xs'}>
                                                {u.type}
                                            </Badge>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleCreate} disabled={submitting || !form.name.trim() || !form.description.trim()}>
                                    {submitting ? t('Creating...') : t('Create Room')}
                                </Button>
                                <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Rooms list */}
                {rooms.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">{t('No MOM rooms yet.')}</p>
                            {canManage && <p className="text-sm text-muted-foreground mt-1">{t('Create a room to start official discussions.')}</p>}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {rooms.map(room => (
                            <Card
                                key={room.id}
                                className={`cursor-pointer hover:shadow-md transition-shadow ${room.status === 'closed' ? 'opacity-70' : ''}`}
                                onClick={() => router.visit(route('mom.rooms.show', room.id))}
                            >
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-sm">{room.name}</h3>
                                                <Badge className={room.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                                                    {room.status === 'closed' ? <><Lock className="h-3 w-3 mr-1 inline" />{t('Closed')}</> : t('Active')}
                                                </Badge>
                                                {room.pending_ack > 0 && (
                                                    <Badge className="bg-red-100 text-red-700">
                                                        <AlertCircle className="h-3 w-3 mr-1 inline" />
                                                        {room.pending_ack} {t('pending ack')}
                                                    </Badge>
                                                )}
                                                {room.unread > 0 && (
                                                    <Badge className="bg-blue-100 text-blue-700">
                                                        {room.unread} {t('new')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {room.member_count} {t('members')}</span>
                                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {room.statement_count} {t('statements')}</span>
                                        <span className="ml-auto">{room.created_at}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
