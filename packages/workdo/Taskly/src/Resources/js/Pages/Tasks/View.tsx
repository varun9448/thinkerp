import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getImagePath, formatDate } from '@/utils/helpers';
import { User, Trash2, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ProjectTask, Project, Milestone, TaskStage } from './types';
import axios from 'axios';
import { toast } from 'sonner';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface ViewTaskProps {
    task: { id: number } | ProjectTask;
    project?: Project;
    milestones: Milestone[];
    teamMembers: Array<{ id: number; name: string; }>;
    taskStages: TaskStage[];
}

export default function View({ task, project, milestones, teamMembers, taskStages }: ViewTaskProps) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;

    const hasComments    = auth.user?.permissions?.includes('manage-project-task-comments');
    const hasSubtasks    = auth.user?.permissions?.includes('manage-project-subtask');
    const hasSubmissions = auth.user?.permissions?.includes('manage-project-task');
    const tabCount       = [hasComments, hasSubtasks, hasSubmissions].filter(Boolean).length;
    const gridColsClass  = (['grid-cols-1', 'grid-cols-2', 'grid-cols-3'] as const)[tabCount - 1] ?? 'grid-cols-3';
    const defaultTab     = hasComments ? 'comments' : hasSubtasks ? 'subtasks' : 'submissions';

    const [taskData, setTaskData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTaskData = async () => {
            try {
                const response = await axios.get(route('project.tasks.show', task.id));
                setTaskData(response.data.task);
            } catch (error) {
                toast.error(t('Failed to load task data'));
            } finally {
                setLoading(false);
            }
        };

        fetchTaskData();
    }, [task.id]);

    if (loading) {
        return (
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('Task Details')}</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-gray-500">{t('Loading task details...')}</p>
                </div>
            </DialogContent>
        );
    }

    if (!taskData) return null;

    const milestone = milestones.find(m => m.id === taskData.milestone_id);
    const stage = taskStages.find(s => s.id === taskData.stage_id);

    const assignedUsers = taskData.assignedUsers || [];

    return (
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('Task Details')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
                {/* Title and Priority */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{taskData.title}</h3>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            taskData.priority === 'Low' ? 'bg-green-100 text-green-800' :
                            taskData.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            taskData.priority === 'High' ? 'bg-red-100 text-red-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {t(taskData.priority)}
                    </span>
                </div>

                {/* Description */}
                {taskData.description && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Description')}</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{taskData.description}</p>
                    </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Project')}</h4>
                        <p className="text-sm text-gray-900">{taskData.project?.name || project?.name || '-'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Milestone')}</h4>
                        <p className="text-sm text-gray-900">{milestone?.title || '-'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Stage')}</h4>
                        {taskData.stage?.name ? (
                            <span className="px-2 py-1 rounded-full text-sm" style={{ backgroundColor: `${taskData.stage?.color || '#e5e7eb'}30`, color: '#374151' }}>
                                {t(taskData.stage.name)}
                            </span>
                        ) : stage?.name ? (
                            <span className="px-2 py-1 rounded-full text-sm" style={{ backgroundColor: `${stage?.color || '#e5e7eb'}30`, color: '#374151' }}>
                                {t(stage.name)}
                            </span>
                        ) : (
                            <span className="text-sm text-gray-900">-</span>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Duration')}</h4>
                        <p className="text-sm text-gray-900">
                            {taskData.start_date && taskData.end_date
                                ? `${formatDate(taskData.start_date)} - ${formatDate(taskData.end_date)}`
                                : taskData.duration || '-'
                            }
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Stars')}</h4>
                        <p className="text-sm text-gray-900">{Number(taskData.bonus_stars || 0) > 0 ? taskData.bonus_stars : '-'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Max Lead Days')}</h4>
                        <p className="text-sm text-gray-900">{taskData.bonus_lead_days !== undefined && taskData.bonus_lead_days !== null ? taskData.bonus_lead_days : '-'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Completed At')}</h4>
                        <p className="text-sm text-gray-900">{taskData.completed_at ? formatDate(taskData.completed_at) : '-'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Bonus Awarded')}</h4>
                        <p className="text-sm text-gray-900">{taskData.bonus_awarded_at ? formatDate(taskData.bonus_awarded_at) : '-'}</p>
                    </div>
                </div>

                {/* Assigned Users */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('Assigned To')}</h4>
                    {assignedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {assignedUsers.map((user, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {user.avatar ? (
                                            <img
                                                src={getImagePath(user.avatar)}
                                                alt={user.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-6 w-6 text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-900">{user.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">{t('No users assigned')}</p>
                    )}
                </div>

                {tabCount > 0 && (
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className={`grid w-full ${gridColsClass}`}>
                            {hasComments    && <TabsTrigger value="comments">{t('Comments')}</TabsTrigger>}
                            {hasSubtasks    && <TabsTrigger value="subtasks">{t('Subtasks')}</TabsTrigger>}
                            {hasSubmissions && <TabsTrigger value="submissions">{t('Submissions')}</TabsTrigger>}
                        </TabsList>
                        {hasComments && (
                            <TabsContent value="comments" className="space-y-4">
                                <CommentsTab taskId={taskData.id} />
                            </TabsContent>
                        )}
                        {hasSubtasks && (
                            <TabsContent value="subtasks" className="space-y-4">
                                <SubtasksTab taskId={taskData.id} />
                            </TabsContent>
                        )}
                        {hasSubmissions && (
                            <TabsContent value="submissions" className="space-y-4">
                                <SubmissionsTab
                                    taskId={taskData.id}
                                    assignedUserIds={taskData.assignedUsers?.map((u: any) => String(u.id)) ?? []}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </div>
        </DialogContent>
    );
}

function CommentsTab({ taskId }: { taskId: number }) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingComments, setLoadingComments] = useState(true);

    const [deleteState, setDeleteState] = useState({ isOpen: false, commentId: null, message: '' });

    const openDeleteDialog = (commentId: number) => {
        setDeleteState({
            isOpen: true,
            commentId,
            message: t('Are you sure you want to delete this comment?')
        });
    };

    const closeDeleteDialog = () => {
        setDeleteState({ isOpen: false, commentId: null, message: '' });
    };

    const confirmDelete = async () => {
        if (!deleteState.commentId) return;

        try {
            const response = await axios.delete(route('project.tasks.comments.destroy', deleteState.commentId));
            if (response.data.message) {
                toast.success(t(response.data.message));
            }
            fetchComments();
            closeDeleteDialog();
        } catch (error) {
            toast.error(t('Failed to delete comment'));
        }
    };

    const fetchComments = async () => {
        try {
            const response = await axios.get(route('project.tasks.comments.index', taskId));
            setComments(response.data.comments);
        } catch (error) {
            toast.error(t('Failed to load comments'));
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post(route('project.tasks.comments.store', taskId), { comment });
            setComment('');
            if (response.data.message) {
                toast.success(t(response.data.message));
            }
            fetchComments();
        } catch (error) {
            toast.error(t('Failed to add comment'));
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <Label htmlFor="comment">{t('Add Comment')}</Label>
                    <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={t('Enter your comment...')}
                        rows={3}
                    />
                </div>
                <Button type="submit" disabled={loading || !comment.trim()}>
                    {loading ? t('Adding...') : t('Add Comment')}
                </Button>
            </form>

            {loadingComments ? (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">{t('Loading comments...')}</p>
                </div>
            ) : comments.length > 0 ? (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-md">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {comment.user.avatar ? (
                                            <img
                                                src={getImagePath(comment.user.avatar)}
                                                alt={comment.user.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-3 w-3 text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(comment.created_at)}
                                    </span>
                                </div>
                                {auth.user?.permissions?.includes('delete-project-task-comments') && (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(comment.id)}
                                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 mt-1"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t('Delete')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <p className="text-sm text-gray-700">{comment.comment}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">{t('No comments yet')}</p>
                </div>
            )}

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete Comment')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                variant="destructive"
            />
        </div>
    );
}

function SubmissionsTab({ taskId, assignedUserIds }: { taskId: number; assignedUserIds: string[] }) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const currentUserId = String(auth.user?.id);
    const isAssigned = assignedUserIds.includes(currentUserId);
    const mySubmission = submissions.find(s => String(s.user_id) === currentUserId);

    const fetchSubmissions = async () => {
        try {
            const response = await axios.get(route('project.tasks.submissions.index', taskId));
            setSubmissions(response.data.submissions || []);
        } catch {
            toast.error(t('Failed to load submissions'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubmissions(); }, [taskId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await axios.post(route('project.tasks.submit-work', taskId), { notes });
            toast.success(t(response.data.message));
            setNotes('');
            fetchSubmissions();
        } catch (error: any) {
            toast.error(t(error.response?.data?.error || 'Failed to submit work'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (submissionId: number) => {
        try {
            const response = await axios.patch(route('project.tasks.submissions.approve', submissionId));
            toast.success(t(response.data.message));
            fetchSubmissions();
        } catch {
            toast.error(t('Failed to approve submission'));
        }
    };

    const handleReject = async (submissionId: number) => {
        try {
            const response = await axios.patch(route('project.tasks.submissions.reject', submissionId), { rejection_reason: rejectionReason });
            toast.success(t(response.data.message));
            setRejectingId(null);
            setRejectionReason('');
            fetchSubmissions();
        } catch {
            toast.error(t('Failed to reject submission'));
        }
    };

    const statusBadge = (status: SubmissionStatus) => {
        if (status === 'approved') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" />{t('Approved')}</span>;
        if (status === 'rejected')  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" />{t('Rejected')}</span>;
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" />{t('Pending')}</span>;
    };

    if (loading) return <div className="text-center py-4"><p className="text-sm text-gray-500">{t('Loading submissions...')}</p></div>;

    return (
        <div className="space-y-4">
            {isAssigned && !mySubmission && (
                <form onSubmit={handleSubmit} className="space-y-3 bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-900">{t('Submit Your Work')}</h4>
                    <div>
                        <Label htmlFor="submission-notes">{t('Notes (optional)')}</Label>
                        <Textarea
                            id="submission-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder={t('Describe your work or attach relevant notes...')}
                            rows={3}
                        />
                    </div>
                    <Button type="submit" size="sm" disabled={submitting}>
                        <Send className="h-3 w-3 mr-1" />
                        {submitting ? t('Submitting...') : t('Submit Work')}
                    </Button>
                </form>
            )}

            {isAssigned && mySubmission && (
                <div className="bg-gray-50 p-3 rounded-md border">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{t('Your Submission')}</span>
                        {statusBadge(mySubmission.status)}
                    </div>
                    <p className="text-xs text-gray-500">{t('Submitted')}: {formatDate(mySubmission.submitted_at)}</p>
                    {mySubmission.notes && <p className="text-sm text-gray-700 mt-1">{mySubmission.notes}</p>}
                    {mySubmission.status === 'rejected' && mySubmission.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">{t('Reason')}: {mySubmission.rejection_reason}</p>
                    )}
                </div>
            )}

            {auth.user?.permissions?.includes('manage-project-task') && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">{t('All Submissions')} ({submissions.length})</h4>
                    {submissions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-3">{t('No submissions yet')}</p>
                    ) : (
                        submissions.map(submission => (
                            <div key={submission.id} className="bg-gray-50 p-3 rounded-md border">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                                            {submission.user?.avatar
                                                ? <img src={getImagePath(submission.user.avatar)} alt={submission.user.name} className="h-full w-full object-cover" />
                                                : <User className="h-4 w-4 text-gray-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{submission.user?.name}</p>
                                            <p className="text-xs text-gray-500">{t('Submitted')}: {formatDate(submission.submitted_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {statusBadge(submission.status as SubmissionStatus)}
                                        {submission.status === 'pending' && rejectingId !== submission.id && (
                                            <>
                                                <Button size="sm" variant="outline" className="h-7 text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleApprove(submission.id)}>
                                                    <CheckCircle className="h-3 w-3 mr-1" />{t('Approve')}
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 text-red-700 border-red-300 hover:bg-red-50" onClick={() => { setRejectingId(submission.id); setRejectionReason(''); }}>
                                                    <XCircle className="h-3 w-3 mr-1" />{t('Reject')}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {submission.notes && <p className="text-sm text-gray-600 mt-2 ml-10">{submission.notes}</p>}
                                {submission.status === 'rejected' && submission.rejection_reason && (
                                    <p className="text-xs text-red-600 mt-1 ml-10">{t('Reason')}: {submission.rejection_reason}</p>
                                )}
                                {submission.status !== 'pending' && submission.approved_by && (
                                    <p className="text-xs text-gray-400 mt-1 ml-10">{t('Reviewed by')}: {submission.approved_by?.name} · {formatDate(submission.approved_at)}</p>
                                )}
                                {rejectingId === submission.id && (
                                    <div className="mt-2 ml-10 space-y-2">
                                        <Textarea
                                            value={rejectionReason}
                                            onChange={e => setRejectionReason(e.target.value)}
                                            placeholder={t('Rejection reason (optional)...')}
                                            rows={2}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="destructive" onClick={() => handleReject(submission.id)}>
                                                {t('Confirm Reject')}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                                                {t('Cancel')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function SubtasksTab({ taskId }: { taskId: number }) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const [name, setName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [subtasks, setSubtasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSubtasks, setLoadingSubtasks] = useState(true);

    const fetchSubtasks = async () => {
        try {
            const response = await axios.get(route('project.tasks.subtasks.index', taskId));
            setSubtasks(response.data.subtasks);
        } catch (error) {
            toast.error(t('Failed to load subtasks'));
        } finally {
            setLoadingSubtasks(false);
        }
    };

    useEffect(() => {
        fetchSubtasks();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post(route('project.tasks.subtasks.store', taskId), {
                name,
                due_date: dueDate || null
            });
            setName('');
            setDueDate('');
            if (response.data.message) {
                toast.success(t(response.data.message));
            }
            fetchSubtasks();
        } catch (error) {
            toast.error(t('Failed to add subtask'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (subtaskId: number) => {
        try {
            await axios.patch(route('project.tasks.subtasks.toggle', subtaskId));
            fetchSubtasks();
        } catch (error) {
            toast.error(t('Failed to update subtask'));
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="subtask-name">{t('Subtask Name')}</Label>
                        <Input
                            id="subtask-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('Enter subtask name...')}
                        />
                    </div>
                    <div>
                        <Label>{t('Due Date')}</Label>
                        <DatePicker
                            value={dueDate}
                            onChange={(value) => setDueDate(value)}
                            placeholder={t('Select due date')}
                        />
                    </div>
                </div>
                <Button type="submit" disabled={loading || !name.trim()}>
                    {loading ? t('Adding...') : t('Add Subtask')}
                </Button>
            </form>

            {loadingSubtasks ? (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">{t('Loading subtasks...')}</p>
                </div>
            ) : subtasks.length > 0 ? (
                <div className="space-y-3">
                    {subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                            <Checkbox
                                checked={subtask.is_completed}
                                onCheckedChange={() => handleToggle(subtask.id)}
                            />
                            <div className="flex-1">
                                <p className={`text-sm ${subtask.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {subtask.name}
                                </p>
                                {subtask.due_date && (
                                    <p className="text-xs text-gray-500">
                                        {t('Due')}: {formatDate(subtask.due_date)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">{t('No subtasks yet')}</p>
                </div>
            )}
        </div>
    );
}
