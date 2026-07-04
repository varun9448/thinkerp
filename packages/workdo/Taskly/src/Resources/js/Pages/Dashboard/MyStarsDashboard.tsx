import { useState } from 'react';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, usePage } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Target, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Clock, Award } from 'lucide-react';

type StarStatus = 'potential' | 'earned' | 'paid' | 'missed';
type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface Submission {
    status: SubmissionStatus;
    submitted_at: string | null;
    notes: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
}

interface TaskDetail {
    id: number;
    title: string;
    bonus_stars: number;
    stage: string;
    stage_color: string | null;
    star_status: StarStatus;
    bonus_deadline: string | null;
    submission: Submission | null;
}

interface ProjectSummary {
    id: number;
    name: string;
    status: string;
    bonus_paid_at: string | null;
    potential_stars: number;
    accumulated_stars: number;
    paid_stars: number;
    missed_stars: number;
    tasks: TaskDetail[];
}

interface MyStarsDashboardProps {
    summary: {
        potential_stars: number;
        accumulated_stars: number;
        paid_stars: number;
        missed_stars: number;
    };
    projects: ProjectSummary[];
}

export default function MyStarsDashboard() {
    const { t } = useTranslation();
    const { summary, projects } = usePage<MyStarsDashboardProps>().props;
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const totalLifetime = Number(summary.accumulated_stars) + Number(summary.paid_stars);

    const starStatusConfig: Record<StarStatus, { label: string; className: string }> = {
        potential: { label: t('Potential'),    className: 'bg-blue-100 text-blue-800' },
        earned:    { label: t('Earned'),       className: 'bg-green-100 text-green-800' },
        paid:      { label: t('Paid Out'),     className: 'bg-purple-100 text-purple-800' },
        missed:    { label: t('Missed'),       className: 'bg-red-100 text-red-800' },
    };

    const submissionConfig: Record<string, { label: string; className: string }> = {
        none:     { label: t('Not Submitted'),  className: 'bg-gray-100 text-gray-600' },
        pending:  { label: t('Pending Review'), className: 'bg-yellow-100 text-yellow-800' },
        approved: { label: t('Approved'),       className: 'bg-green-100 text-green-800' },
        rejected: { label: t('Rejected'),       className: 'bg-red-100 text-red-800' },
    };

    const projectStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'finished': return 'bg-green-100 text-green-800';
            case 'ongoing':  return 'bg-blue-100 text-blue-800';
            case 'onhold':   return 'bg-yellow-100 text-yellow-800';
            default:         return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('My Stars') }]}
            pageTitle={t('My Stars')}
        >
            <Head title={t('My Stars Dashboard')} />

            <div className="space-y-6">

                {/* Summary stat cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">{t('Potential Stars')}</CardTitle>
                            <Target className="h-6 w-6 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-blue-400 fill-blue-300" />
                                <span className="text-3xl font-bold text-blue-700">{Number(summary.potential_stars)}</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">{t('From incomplete tasks assigned to you')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">{t('Accumulated Stars')}</CardTitle>
                            <Star className="h-6 w-6 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                <span className="text-3xl font-bold text-green-700">{Number(summary.accumulated_stars)}</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">{t('Earned, awaiting payroll payout')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">{t('Stars Paid Out')}</CardTitle>
                            <Award className="h-6 w-6 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-purple-400 fill-purple-300" />
                                <span className="text-3xl font-bold text-purple-700">{Number(summary.paid_stars)}</span>
                            </div>
                            <p className="text-xs text-purple-600 mt-1">{t('Already included in payroll')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-700">{t('Total Lifetime Stars')}</CardTitle>
                            <CheckCircle className="h-6 w-6 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                                <span className="text-3xl font-bold text-amber-700">{totalLifetime}</span>
                            </div>
                            <p className="text-xs text-amber-600 mt-1">{t('Earned + paid out combined')}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 items-center text-sm">
                    <span className="text-muted-foreground font-medium">{t('Star Status')}:</span>
                    {(Object.entries(starStatusConfig) as [StarStatus, { label: string; className: string }][]).map(([key, cfg]) => (
                        <Badge key={key} className={cfg.className}>{cfg.label}</Badge>
                    ))}
                    <span className="text-muted-foreground font-medium ml-4">{t('Submission')}:</span>
                    {(['pending', 'approved', 'rejected'] as const).map(s => (
                        <Badge key={s} className={submissionConfig[s].className}>{submissionConfig[s].label}</Badge>
                    ))}
                </div>

                {/* Per-project detail cards */}
                {projects.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            {t('No projects assigned yet.')}
                        </CardContent>
                    </Card>
                ) : (
                    projects.map(project => (
                        <Card key={project.id}>
                            {/* Project header — click to expand/collapse */}
                            <CardHeader
                                className="cursor-pointer select-none"
                                onClick={() => toggle(project.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <CardTitle className="text-base">{project.name}</CardTitle>
                                        <Badge className={projectStatusColor(project.status)}>{project.status}</Badge>
                                        {project.bonus_paid_at && (
                                            <Badge className="bg-purple-100 text-purple-700">
                                                {t('Bonus Paid')} · {project.bonus_paid_at}
                                            </Badge>
                                        )}
                                    </div>
                                    {expanded[project.id]
                                        ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    }
                                </div>

                                {/* Project star mini-summary */}
                                <div className="flex flex-wrap gap-4 mt-3 text-sm" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1 text-blue-600">
                                        <Target className="h-3.5 w-3.5" />
                                        <span className="font-semibold">{Number(project.potential_stars)}</span>
                                        <span className="text-muted-foreground">{t('potential')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-600">
                                        <Star className="h-3.5 w-3.5 fill-green-400" />
                                        <span className="font-semibold">{Number(project.accumulated_stars)}</span>
                                        <span className="text-muted-foreground">{t('earned')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-purple-600">
                                        <Award className="h-3.5 w-3.5" />
                                        <span className="font-semibold">{Number(project.paid_stars)}</span>
                                        <span className="text-muted-foreground">{t('paid')}</span>
                                    </div>
                                    {Number(project.missed_stars) > 0 && (
                                        <div className="flex items-center gap-1 text-red-500">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            <span className="font-semibold">{Number(project.missed_stars)}</span>
                                            <span className="text-muted-foreground">{t('missed')}</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            {/* Task detail table */}
                            {expanded[project.id] && (
                                <CardContent className="pt-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-gray-50 text-muted-foreground text-xs uppercase tracking-wide">
                                                    <th className="text-left py-2 px-3 font-medium">{t('Task')}</th>
                                                    <th className="text-center py-2 px-3 font-medium">{t('Stars')}</th>
                                                    <th className="text-center py-2 px-3 font-medium">{t('Stage')}</th>
                                                    <th className="text-center py-2 px-3 font-medium">{t('Star Status')}</th>
                                                    <th className="text-center py-2 px-3 font-medium">{t('My Submission')}</th>
                                                    <th className="text-center py-2 px-3 font-medium">{t('Bonus Deadline')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {project.tasks.map(task => {
                                                    const subKey = task.submission?.status ?? 'none';
                                                    const subCfg = submissionConfig[subKey];
                                                    const starCfg = starStatusConfig[task.star_status];

                                                    return (
                                                        <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="py-3 px-3 font-medium max-w-xs">
                                                                <span className="line-clamp-2">{task.title}</span>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold">
                                                                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                                                                    {Number(task.bonus_stars)}
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                <Badge
                                                                    variant="secondary"
                                                                    style={task.stage_color ? { backgroundColor: task.stage_color, color: '#fff' } : {}}
                                                                >
                                                                    {task.stage}
                                                                </Badge>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                <Badge className={starCfg.className}>{starCfg.label}</Badge>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Badge className={subCfg.className}>{subCfg.label}</Badge>
                                                                    {task.submission?.submitted_at && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {task.submission.submitted_at}
                                                                        </span>
                                                                    )}
                                                                    {task.submission?.rejection_reason && (
                                                                        <span className="text-xs text-red-500 max-w-32 text-center line-clamp-2">
                                                                            {task.submission.rejection_reason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                {task.bonus_deadline ? (
                                                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>{task.bonus_deadline}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </AuthenticatedLayout>
    );
}
