import { useState, useMemo } from 'react';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, FileText, AlertCircle, ChevronRight, Lock, Archive, Search, FolderKanban } from 'lucide-react';

interface Room {
    id: number;
    name: string;
    description: string;
    status: 'active' | 'closed' | 'archived';
    project_id: number;
    project_name: string;
    clients: string[];
    member_count: number;
    statement_count: number;
    pending_ack: number;
    unread: number;
    is_member: boolean;
    updated_at: string;
}

interface Project { id: number; name: string; }

interface AllRoomsProps {
    rooms: Room[];
    projects: Project[];
    canManage: boolean;
}

const STATUS_CONFIG = {
    active:   { label: 'Active',    className: 'bg-green-100 text-green-800' },
    closed:   { label: 'Closed',    className: 'bg-gray-100 text-gray-600' },
    archived: { label: 'Archived',  className: 'bg-amber-100 text-amber-700' },
};

export default function AllRooms() {
    const { t } = useTranslation();
    const { rooms, projects, canManage } = usePage<AllRoomsProps>().props;

    const [filterProject, setFilterProject] = useState('all');
    const [filterStatus, setFilterStatus]   = useState('all');
    const [filterRoomName, setFilterRoomName] = useState('');
    const [filterClient, setFilterClient]   = useState('');

    const filtered = useMemo(() => {
        return rooms.filter(room => {
            if (filterProject !== 'all' && room.project_id !== parseInt(filterProject)) return false;
            if (filterStatus  !== 'all' && room.status !== filterStatus) return false;
            if (filterRoomName.trim() && !room.name.toLowerCase().includes(filterRoomName.toLowerCase())) return false;
            if (filterClient.trim()) {
                const match = room.clients.some(c => c.toLowerCase().includes(filterClient.toLowerCase()));
                if (!match) return false;
            }
            return true;
        });
    }, [rooms, filterProject, filterStatus, filterRoomName, filterClient]);

    const counts = useMemo(() => ({
        active:   rooms.filter(r => r.status === 'active').length,
        closed:   rooms.filter(r => r.status === 'closed').length,
        archived: rooms.filter(r => r.status === 'archived').length,
    }), [rooms]);

    const totalPendingAck = rooms.reduce((sum, r) => sum + r.pending_ack, 0);

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('MOM') }, { label: t('All Rooms') }]}
            pageTitle={t('Minutes of Meeting — All Rooms')}
        >
            <Head title={t('MOM Rooms')} />

            <div className="space-y-5">

                {/* Summary strip */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">{counts.active} {t('Active')}</Badge>
                        <Badge className="bg-gray-100 text-gray-600">{counts.closed} {t('Closed')}</Badge>
                        <Badge className="bg-amber-100 text-amber-700">{counts.archived} {t('Archived')}</Badge>
                    </div>
                    {totalPendingAck > 0 && (
                        <Badge className="bg-red-100 text-red-700 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {totalPendingAck} {t('pending acknowledgment(s) across all rooms')}
                        </Badge>
                    )}
                </div>

                {/* Filter bar */}
                <div className="bg-white border rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Room name search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={filterRoomName}
                            onChange={e => setFilterRoomName(e.target.value)}
                            placeholder={t('Search room name...')}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {/* Project filter */}
                    <Select value={filterProject} onValueChange={setFilterProject}>
                        <SelectTrigger className="h-9 text-sm">
                            <FolderKanban className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                            <SelectValue placeholder={t('All Projects')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Client name search */}
                    <div className="relative">
                        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={filterClient}
                            onChange={e => setFilterClient(e.target.value)}
                            placeholder={t('Search client name...')}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {/* Status filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={t('All Statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Statuses')}</SelectItem>
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="closed">{t('Closed')}</SelectItem>
                            <SelectItem value="archived">{t('Archived')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Results count */}
                <p className="text-xs text-muted-foreground">
                    {t('Showing')} {filtered.length} {t('of')} {rooms.length} {t('rooms')}
                </p>

                {/* Rooms grid */}
                {filtered.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                            <p className="text-muted-foreground text-sm">{t('No rooms match your filters.')}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map(room => {
                            const statusCfg = STATUS_CONFIG[room.status];
                            const isArchived = room.status === 'archived';

                            return (
                                <Card
                                    key={room.id}
                                    className={`cursor-pointer hover:shadow-md transition-shadow ${isArchived ? 'opacity-75 bg-amber-50/40' : ''}`}
                                    onClick={() => router.visit(route('mom.rooms.show', room.id))}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        {/* Header row */}
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={`font-semibold text-sm ${isArchived ? 'text-muted-foreground' : ''}`}>
                                                        {room.name}
                                                    </h3>
                                                    <Badge className={`text-xs ${statusCfg.className}`}>
                                                        {isArchived && <Archive className="h-3 w-3 mr-1 inline" />}
                                                        {isArchived && room.status === 'closed' && <Lock className="h-3 w-3 mr-1 inline" />}
                                                        {t(statusCfg.label)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                                    <FolderKanban className="h-3 w-3" />
                                                    <span>{room.project_name}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>

                                        {/* Clients */}
                                        {room.clients.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <Users className="h-3 w-3 text-orange-500 shrink-0" />
                                                {room.clients.slice(0, 3).map((c, i) => (
                                                    <Badge key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200">{c}</Badge>
                                                ))}
                                                {room.clients.length > 3 && (
                                                    <span className="text-xs text-muted-foreground">+{room.clients.length - 3} {t('more')}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats row */}
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" /> {room.member_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3.5 w-3.5" /> {room.statement_count}
                                            </span>
                                            {room.pending_ack > 0 && (
                                                <Badge className="text-xs bg-red-100 text-red-700">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    {room.pending_ack} {t('pending ack')}
                                                </Badge>
                                            )}
                                            {room.unread > 0 && (
                                                <Badge className="text-xs bg-blue-100 text-blue-700">
                                                    {room.unread} {t('new')}
                                                </Badge>
                                            )}
                                            <span className="ml-auto">{room.updated_at}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
