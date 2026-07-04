import { FolderKanban, Star, MessageSquare } from 'lucide-react';

declare global {
    function route(name: string): string;
}

export const projectCompanyMenu = (t: (key: string) => string) => [
    {
        title: t('Project Dashboard'),
        href: route('project.dashboard.index'),
        permission: 'manage-project-dashboard',
        parent: 'dashboard',
        order: 20,
    },
    {
        title: t('Project'),
        icon: FolderKanban,
        permission: 'manage-project',
        order: 300,
        name : 'project',
        children: [
            {
                title: t('Projects'),
                href: route('project.index'),
                permission: 'manage-project',
                order: 5,
            },
            {
                title: t('Projects Report'),
                href: route('project.report.index'),
                permission: 'manage-project-report',
                order: 10,
            },
            {
                title: t('System Setup'),
                href: route('project.task-stages.index'),
                permission: 'manage-task-stages',
                order: 20,
                activePaths: [route('project.bug-stages.index')],
            },
            {
                title: t('MOM Settings'),
                href: route('mom.settings'),
                permission: 'manage-project',
                order: 25,
            },
        ],
    },
    {
        title: t('MOM'),
        icon: MessageSquare,
        permission: 'manage-project-task',
        order: 310,
        children: [
            {
                title: t('Rooms'),
                href: route('mom.rooms.all'),
                permission: 'manage-project-task',
                order: 5,
                activePaths: [route('mom.rooms.all')],
            },
        ],
    },
    {
        title: t('My Stars'),
        href: route('project.my-stars.index'),
        icon: Star,
        permission: 'manage-project-task',
        order: 460,
        activePaths: [route('project.my-stars.index')],
    },
];
