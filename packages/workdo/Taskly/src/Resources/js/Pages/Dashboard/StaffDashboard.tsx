import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from '@/components/charts';
import { CheckSquare, Clock, AlertTriangle, ListTodo, Calendar, Target, Star, Trophy } from 'lucide-react';

interface Task {
    id: number;
    title: string;
    priority: string;
    project: string;
    stage: string;
    stage_color?: string;
    due_date?: string;
    created_at?: string;
    is_completed: boolean;
    is_overdue?: boolean;
}

interface ChartData {
    name: string;
    value: number;
    color?: string;
}

interface StaffProject {
    name: string;
    status: string;
    progress: number;
    total_items: number;
    completed_items: number;
    stars_pool: number;
    my_stars: number;
    top_earner: { name: string; stars: number } | null;
}

interface StaffDashboardProps {
    stats: {
        total_tasks: number;
        completed_tasks: number;
        pending_tasks: number;
        overdue_tasks: number;
        completion_rate: number;
    };
    todayTasks: Task[];
    latestTasks: Task[];
    taskPriority: ChartData[];
    staffProjects: StaffProject[];
}

export default function StaffDashboard() {
    const { t } = useTranslation();
    const { stats, todayTasks = [], latestTasks = [], taskPriority, staffProjects } = usePage<StaffDashboardProps>().props;

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-red-500 text-white';
            case 'medium': return 'bg-yellow-500 text-white';
            case 'low': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'finished': return 'bg-green-100 text-green-800';
            case 'ongoing': return 'bg-blue-100 text-blue-800';
            case 'onhold': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const StatCard = ({ title, value, subtitle, color = "blue", icon: Icon }: any) => {
        const colorClasses = {
            blue: "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200",
            green: "bg-gradient-to-r from-green-50 to-green-100 border-green-200",
            red: "bg-gradient-to-r from-red-50 to-red-100 border-red-200",
            orange: "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
        };
        const textColors = {
            blue: "text-blue-700",
            green: "text-green-700",
            red: "text-red-700",
            orange: "text-orange-700"
        };
        return (
            <Card className={`relative overflow-hidden ${colorClasses[color as keyof typeof colorClasses]}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium ${textColors[color as keyof typeof textColors]}`}>{title}</CardTitle>
                    {Icon && <Icon className={`h-8 w-8 ${textColors[color as keyof typeof textColors]} opacity-80`} />}
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${textColors[color as keyof typeof textColors]}`}>{value}</div>
                    {subtitle && (
                        <p className={`text-xs ${textColors[color as keyof typeof textColors]} opacity-80 mt-1`}>{subtitle}</p>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('Staff Dashboard') }]}
            pageTitle={t('Staff Dashboard')}
        >
            <Head title={t('Staff Dashboard')} />

            <div className="space-y-6">
                {/* Staff Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title={t('My Tasks')}
                        value={stats.total_tasks}
                        subtitle="Assigned to me"
                        color="blue"
                        icon={ListTodo}
                    />
                    <StatCard
                        title={t('Completed')}
                        value={stats.completed_tasks}
                        subtitle={`${stats.completion_rate}% completion rate`}
                        color="green"
                        icon={CheckSquare}
                    />
                    <StatCard
                        title={t('Pending')}
                        value={stats.pending_tasks}
                        subtitle="Tasks remaining"
                        color="orange"
                        icon={Clock}
                    />
                    <StatCard
                        title={t('Overdue')}
                        value={stats.overdue_tasks}
                        subtitle="Need attention"
                        color="red"
                        icon={AlertTriangle}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Task Priority Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('Task Priority')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <PieChart
                                    data={taskPriority.filter(item => item.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    height={200}
                                    donut={true}
                                    showTooltip={true}
                                />
                                <div className="space-y-2">
                                    {taskPriority.filter(item => item.value > 0).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: item.color }}
                                                ></div>
                                                <span className="text-sm font-medium">{item.name}</span>
                                            </div>
                                            <span className="text-base font-bold">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Projects */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('Projects')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                            {staffProjects.length > 0 ? (
                                staffProjects.map((project, index) => (
                                    <div key={index} className="border rounded-lg p-3 space-y-3">
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm truncate">{project.name}</span>
                                            <Badge size="sm" className={getStatusColor(project.status)}>
                                                {project.status}
                                            </Badge>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{project.completed_items}/{project.total_items} {t('items')}</span>
                                                <span>{project.progress}% {t('completed')}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stars metrics */}
                                        <div className="grid grid-cols-3 divide-x border-t pt-2">
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-xs text-muted-foreground mb-1">{t('Stars Pool')}</span>
                                                <div className="flex items-center gap-1 text-yellow-600 font-semibold text-sm">
                                                    <Star className="h-3 w-3 fill-yellow-400" />
                                                    {Number(project.stars_pool)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-xs text-muted-foreground mb-1">{t('My Stars')}</span>
                                                <div className={`flex items-center gap-1 font-semibold text-sm ${project.my_stars > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                                    <Star className={`h-3 w-3 ${project.my_stars > 0 ? 'fill-blue-400' : ''}`} />
                                                    {Number(project.my_stars)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center px-1">
                                                <span className="text-xs text-muted-foreground mb-1">{t('Top Earner')}</span>
                                                {project.top_earner ? (
                                                    <div className="flex items-center gap-1">
                                                        <Trophy className="h-3 w-3 text-amber-500" />
                                                        <span className="text-xs font-medium truncate max-w-16">{project.top_earner.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">{t('No projects assigned')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>


                {/* Latest Assigned Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('Latest Assigned Tasks')}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {t('Your 6 most recently assigned tasks')}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(latestTasks || []).length > 0 ? (
                                (latestTasks || []).map((task) => (
                                    <div key={task.id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <h4 className="font-medium text-sm truncate">{task.title}</h4>
                                            {task.is_completed && (
                                                <span className="text-green-500 text-xs">✓</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{t('Priority')}:</span>
                                                <Badge size="sm" className={getPriorityColor(task.priority)}>
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{t('Stage')}:</span>
                                                <Badge
                                                    size="sm"
                                                    variant="secondary"
                                                    style={task.stage_color ? { backgroundColor: task.stage_color, color: '#fff' } : {}}
                                                >
                                                    {task.stage}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{t('Project')}:</span>
                                                <span className="font-medium truncate">{task.project}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8">
                                    <p className="text-gray-500">{t('No tasks assigned yet')}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
