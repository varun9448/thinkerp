<?php

namespace Workdo\Taskly\Http\Controllers;

use App\Models\User;
use App\Models\Warehouse;
use App\Models\Order;
use App\Models\Plan;
use App\Models\DemoItem;
use App\Models\DemoType;
use App\Models\HelpdeskTicket;
use App\Models\Transfer;
use App\Models\LoginHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Workdo\Taskly\Models\TaskWorkSubmission;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Routing\Controller;
use Workdo\Taskly\Models\Project;
use Workdo\Taskly\Models\ProjectBug;
use Workdo\Taskly\Models\ProjectTask;

class DashboardController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-project-dashboard')) {
            $user = Auth::user();
            $userType = $user->type;

            // Route to appropriate dashboard based on user type
            switch ($userType) {
                case 'company':
                    return $this->companyDashboard();
                case 'client':
                    return $this->clientDashboard();
                case 'staff':
                default:
                    return $this->staffDashboard();
            }
        }
    }

    private function companyDashboard()
    {
        $user = Auth::user();
        $creatorId = creatorId();

        // Company-wide Stats
        $totalProjects = Project::where('created_by', $creatorId)->count();
        $totalTasks = ProjectTask::where('created_by', $creatorId)->count();
        $totalBugs = ProjectBug::where('created_by', $creatorId)->count();
        $totalUsers = User::where('created_by', $creatorId)->where('type', 'staff')->count();
        $totalClients = User::where('created_by', $creatorId)->where('type', 'client')->count();
        $completedTasks = ProjectTask::where('created_by', $creatorId)
            ->whereHas('taskStage', function ($query) {
                $query->where('complete', true); })->count();

        // Company Recent Tasks with enhanced data
        $recentTasks = ProjectTask::with(['project', 'taskStage'])
            ->where('created_by', $creatorId)
            ->latest()
            ->limit(8)
            ->get()
            ->map(function ($task) {
                // Handle JSON assigned_to
                $assigneeNames = [];
                if ($task->assigned_to) {
                    $assigneeIds = is_array($task->assigned_to) ? $task->assigned_to : json_decode($task->assigned_to, true);
                    if ($assigneeIds) {
                        $assignees = User::whereIn('id', $assigneeIds)->get();
                        $assigneeNames = $assignees->pluck('name')->toArray();
                    }
                }

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'priority' => $task->priority ?? 'Medium',
                    'project' => $task->project->name ?? 'No Project',
                    'stage' => $task->taskStage->name ?? 'No Stage',
                    'stage_color' => $task->taskStage->color ?? null,
                    'assignee' => !empty($assigneeNames) ? implode(', ', $assigneeNames) : 'Unassigned',
                    'created_at' => $task->created_at->format('M d, Y'),
                    'is_completed' => $task->taskStage ? $task->taskStage->complete : false
                ];
            });

        $isDemo = config('app.is_demo');
        // Company Project Status Distribution
        $projectStatus = [
            ['name' => 'Ongoing', 'value' => Project::where('created_by', $creatorId)->where('status', 'Ongoing')->count(), 'color' => '#3b82f6'],
            ['name' => 'Finished', 'value' => Project::where('created_by', $creatorId)->where('status', 'Finished')->count(), 'color' => '#10b77f'],
            ['name' => 'On Hold', 'value' => Project::where('created_by', $creatorId)->where('status', 'Onhold')->count(), 'color' => '#f59e0b']
        ];

        // Company Task Priority Distribution
        $taskPriority = [
            ['name' => 'High', 'value' => ProjectTask::where('created_by', $creatorId)->where('priority', 'High')->count(), 'color' => '#ef4444'],
            ['name' => 'Medium', 'value' => ProjectTask::where('created_by', $creatorId)->where('priority', 'Medium')->count(), 'color' => '#f59e0b'],
            ['name' => 'Low', 'value' => ProjectTask::where('created_by', $creatorId)->where('priority', 'Low')->count(), 'color' => '#10b77f']
        ];

        // Company Team Performance
        $teamPerformance = User::where('created_by', $creatorId)
            ->get()
            ->map(function ($user) use ($creatorId) {
                $totalTasks = ProjectTask::where('created_by', $creatorId)
                    ->where(function ($query) use ($user) {
                        $query->whereJsonContains('assigned_to', (string) $user->id)
                            ->orWhere('assigned_to', 'like', '%' . $user->id . '%');
                    })
                    ->count();

                $completedTasks = ProjectTask::where('created_by', $creatorId)
                    ->where(function ($query) use ($user) {
                        $query->whereJsonContains('assigned_to', (string) $user->id)
                            ->orWhere('assigned_to', 'like', '%' . $user->id . '%');
                    })
                    ->whereHas('taskStage', function ($q) {
                        $q->where('complete', true);
                    })
                    ->count();

                return [
                    'name' => $user->name,
                    'total_tasks' => $totalTasks,
                    'completed_tasks' => $completedTasks,
                    'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0
                ];
            })
            ->filter(function ($user) {
                return $user['total_tasks'] > 0;
            })
            ->take(6)
            ->values();

        // Company Monthly Progress (last 6 months)
        $monthlyProgress = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $monthName = $date->format('M');

            if ($isDemo) {
                $tasksCreated = rand(20, 50);
                $tasksCompleted = rand(15, 45);
            } else {
                $tasksCreated = ProjectTask::where('created_by', $creatorId)
                    ->whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->count();

                $tasksCompleted = ProjectTask::where('created_by', $creatorId)
                    ->whereMonth('updated_at', $date->month)
                    ->whereYear('updated_at', $date->year)
                    ->whereHas('taskStage', function ($query) {
                        $query->where('complete', true);
                    })
                    ->count();
            }

            $monthlyProgress[] = [
                'month' => $monthName,
                'created' => $tasksCreated,
                'completed' => $tasksCompleted
            ];
        }

        // Company Project Health (overdue projects)
        $overdueProjects = Project::where('created_by', $creatorId)
            ->where('end_date', '<', Carbon::now())
            ->where('status', '!=', 'Finished')
            ->count();

        // Company Bug Statistics
        $totalBugsCount = ProjectBug::where('created_by', $creatorId)->count();
        $resolvedBugsCount = ProjectBug::where('created_by', $creatorId)
            ->whereHas('bugStage', function ($query) {
                $query->where('complete', true);
            })->count();

        $bugStats = [
            'open' => $totalBugsCount - $resolvedBugsCount,
            'resolved' => $resolvedBugsCount
        ];

        return Inertia::render('Taskly/Dashboard/CompanyDashboard', [
            'stats' => [
                'total_projects' => $totalProjects,
                'total_tasks' => $totalTasks,
                'total_bugs' => $totalBugs,
                'total_users' => $totalUsers,
                'total_clients' => $totalClients,
                'completed_tasks' => $completedTasks,
                'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
                'overdue_projects' => $overdueProjects
            ],
            'recentTasks' => $recentTasks,
            'projectStatus' => $projectStatus,
            'taskPriority' => $taskPriority,
            'teamPerformance' => $teamPerformance,
            'monthlyProgress' => $monthlyProgress,
            'bugStats' => $bugStats
        ]);
    }

    private function clientDashboard()
    {
        $user = Auth::user();
        $creatorId = $user->created_by;

        // Client-specific projects
        $clientProjects = Project::where('created_by', $creatorId)
            ->whereHas('clients', function ($query) use ($user) {
                $query->where('client_id', $user->id);
            })
            ->with(['clients'])
            ->get();

        // Client-specific tasks (from client's projects)
        $clientProjectIds = $clientProjects->pluck('id');
        $clientTasks = ProjectTask::where('created_by', $creatorId)
            ->whereIn('project_id', $clientProjectIds)
            ->with(['project', 'taskStage'])
            ->latest()
            ->get();

        $completedTasks = $clientTasks->filter(function ($task) {
            return $task->taskStage && $task->taskStage->complete;
        })->count();

        // Recent tasks for client (from client's projects)
        $recentTasks = $clientTasks->take(6)->map(function ($task) {
            // Get assignee names
            $assigneeNames = [];
            if ($task->assigned_to) {
                $assigneeIds = is_array($task->assigned_to) ? $task->assigned_to : json_decode($task->assigned_to, true);
                if ($assigneeIds) {
                    $assignees = User::whereIn('id', $assigneeIds)->get();
                    $assigneeNames = $assignees->pluck('name')->toArray();
                }
            }

            return [
                'id' => $task->id,
                'title' => $task->title,
                'priority' => $task->priority ?? 'Medium',
                'project' => $task->project->name ?? 'No Project',
                'stage' => $task->taskStage->name ?? 'No Stage',
                'stage_color' => $task->taskStage->color ?? null,
                'assignee' => !empty($assigneeNames) ? implode(', ', $assigneeNames) : 'Unassigned',
                'created_at' => $task->created_at->format('M d, Y'),
                'is_completed' => $task->taskStage ? $task->taskStage->complete : false
            ];
        });

        // Project progress for client
        $projectProgress = $clientProjects->map(function ($project) {
            $totalTasks = $project->tasks->count();
            $completedTasks = $project->tasks->filter(function ($task) {
                return $task->taskStage && $task->taskStage->complete;
            })->count();

            return [
                'name' => $project->name,
                'progress' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'status' => $project->status
            ];
        });

        return Inertia::render('Taskly/Dashboard/ClientDashboard', [
            'stats' => [
                'total_projects' => $clientProjects->count(),
                'total_tasks' => $clientTasks->count(),
                'completed_tasks' => $completedTasks,
                'completion_rate' => $clientTasks->count() > 0 ? round(($completedTasks / $clientTasks->count()) * 100) : 0,
                'pending_tasks' => $clientTasks->count() - $completedTasks
            ],
            'recentTasks' => $recentTasks,
            'projectProgress' => $projectProgress,
            'clientProjects' => $clientProjects->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'status' => $project->status,
                    'start_date' => $project->start_date,
                    'end_date' => $project->end_date
                ];
            })
        ]);
    }

    private function staffDashboard()
    {
        $user = Auth::user();
        $creatorId = $user->created_by;

        // Staff personal tasks
        $personalTasks = ProjectTask::where('created_by', $creatorId)
            ->where(function ($query) use ($user) {
                $query->whereJsonContains('assigned_to', (string) $user->id)
                    ->orWhere('assigned_to', 'like', '%' . $user->id . '%');
            })
            ->with(['project', 'taskStage'])
            ->get();

        $completedTasks = $personalTasks->filter(function ($task) {
            return $task->taskStage && $task->taskStage->complete;
        })->count();

        $pendingTasks = $personalTasks->count() - $completedTasks;
        $overdueTasks = $personalTasks->filter(function ($task) {
            return $task->due_date && $task->due_date < now() && (!$task->taskStage || !$task->taskStage->complete);
        })->count();



        // Task priority breakdown
        $taskPriority = [
            ['name' => 'High', 'value' => $personalTasks->where('priority', 'High')->count(), 'color' => '#ef4444'],
            ['name' => 'Medium', 'value' => $personalTasks->where('priority', 'Medium')->count(), 'color' => '#f59e0b'],
            ['name' => 'Low', 'value' => $personalTasks->where('priority', 'Low')->count(), 'color' => '#10b77f']
        ];

        // Projects staff is involved in
        $staffProjects = Project::where('created_by', $creatorId)
            ->whereHas('tasks', function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    $q->whereJsonContains('assigned_to', (string) $user->id)
                        ->orWhere('assigned_to', 'like', '%' . $user->id . '%');
                });
            })
            ->with(['tasks.taskStage', 'milestones'])
            ->get()
            ->map(function ($project) use ($user) {
                $allTasks = $project->tasks;

                // Combined progress: tasks + milestones
                $totalTasks       = $allTasks->count();
                $completedTasks   = $allTasks->filter(fn($t) => $t->taskStage && $t->taskStage->complete)->count();
                $totalMilestones  = $project->milestones->count();
                $completedMilestones = $project->milestones->where('status', 'Complete')->count();
                $totalItems       = $totalTasks + $totalMilestones;
                $completedItems   = $completedTasks + $completedMilestones;
                $progress         = $totalItems > 0 ? round(($completedItems / $totalItems) * 100) : 0;

                // Stars pool: sum of all task bonus_stars in this project
                $starsPool = $allTasks->sum(fn($t) => (float) ($t->bonus_stars ?? 0));

                // My stars: tasks where I appear in bonus_awarded_to
                $userId = (string) $user->id;
                $myStars = $allTasks
                    ->filter(fn($t) =>
                        $t->bonus_awarded_at !== null &&
                        is_array($t->bonus_awarded_to) &&
                        in_array($userId, array_map('strval', $t->bonus_awarded_to))
                    )
                    ->sum(fn($t) => (float) ($t->bonus_stars ?? 0));

                // Top earner: user with highest accumulated stars in this project
                $earnerStars = [];
                foreach ($allTasks as $task) {
                    if (!$task->bonus_awarded_at || !is_array($task->bonus_awarded_to)) {
                        continue;
                    }
                    foreach ($task->bonus_awarded_to as $uid) {
                        $uid = (string) $uid;
                        $earnerStars[$uid] = ($earnerStars[$uid] ?? 0) + (float) ($task->bonus_stars ?? 0);
                    }
                }

                $topEarner = null;
                if (!empty($earnerStars)) {
                    arsort($earnerStars);
                    $topEarnerId   = array_key_first($earnerStars);
                    $topEarnerUser = User::find($topEarnerId);
                    if ($topEarnerUser) {
                        $topEarner = [
                            'name'  => $topEarnerUser->name,
                            'stars' => $earnerStars[$topEarnerId],
                        ];
                    }
                }

                return [
                    'name'            => $project->name,
                    'status'          => $project->status,
                    'progress'        => $progress,
                    'total_items'     => $totalItems,
                    'completed_items' => $completedItems,
                    'stars_pool'      => $starsPool,
                    'my_stars'        => $myStars,
                    'top_earner'      => $topEarner,
                ];
            });

        // Latest 6 assigned tasks
        $latestTasks = $personalTasks->take(6)->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'priority' => $task->priority ?? 'Medium',
                'project' => $task->project->name ?? 'No Project',
                'stage' => $task->taskStage->name ?? 'No Stage',
                'stage_color' => $task->taskStage->color ?? null,
                'is_completed' => $task->taskStage ? $task->taskStage->complete : false
            ];
        });
        return Inertia::render('Taskly/Dashboard/StaffDashboard', [
            'stats' => [
                'total_tasks' => $personalTasks->count() > 0 ? $personalTasks->count() : 0,
                'completed_tasks' => $completedTasks,
                'pending_tasks' => $pendingTasks > 0 ? $pendingTasks : 0,
                'overdue_tasks' => $overdueTasks,
                'completion_rate' => $personalTasks->count() > 0 ? round(($completedTasks / $personalTasks->count()) * 100) : 0
            ],
            'todayTasks' => [],
            'latestTasks' => $latestTasks,
            'taskPriority' => $taskPriority,
            'staffProjects' => $staffProjects
        ]);
    }

    public function myStarsDashboard()
    {
        $user      = Auth::user();
        $creatorId = $user->created_by;
        $userId    = (string) $user->id;

        $assignedTasks = ProjectTask::with(['project', 'taskStage'])
            ->where('created_by', $creatorId)
            ->where(function ($q) use ($user) {
                $q->whereJsonContains('assigned_to', (string) $user->id)
                  ->orWhere('assigned_to', 'like', '%' . $user->id . '%');
            })
            ->get();

        // Load this employee's own submissions for these tasks
        $submissionsMap = [];
        if (Schema::hasTable('task_work_submissions')) {
            $submissionsMap = TaskWorkSubmission::where('user_id', $user->id)
                ->whereIn('task_id', $assignedTasks->pluck('id'))
                ->get()
                ->keyBy('task_id')
                ->all();
        }

        $summary = [
            'potential_stars'   => 0.0,
            'accumulated_stars' => 0.0,
            'paid_stars'        => 0.0,
            'missed_stars'      => 0.0,
        ];

        $projectsMap = [];

        foreach ($assignedTasks as $task) {
            $pid     = $task->project_id;
            $project = $task->project;

            if (!isset($projectsMap[$pid])) {
                $projectsMap[$pid] = [
                    'id'               => $pid,
                    'name'             => $project->name,
                    'status'           => $project->status,
                    'bonus_paid_at'    => $project->bonus_paid_at?->toDateString(),
                    'potential_stars'  => 0.0,
                    'accumulated_stars'=> 0.0,
                    'paid_stars'       => 0.0,
                    'missed_stars'     => 0.0,
                    'tasks'            => [],
                ];
            }

            $isComplete  = $task->taskStage && $task->taskStage->complete;
            $awardedTo   = is_array($task->bonus_awarded_to) ? array_map('strval', $task->bonus_awarded_to) : [];
            $iAwarded    = $task->bonus_awarded_at && in_array($userId, $awardedTo);
            $projectPaid = !is_null($project->bonus_paid_at);
            $stars       = (float) ($task->bonus_stars ?? 0);

            if (!$isComplete) {
                $starStatus = 'potential';
                $summary['potential_stars']             += $stars;
                $projectsMap[$pid]['potential_stars']   += $stars;
            } elseif ($iAwarded && $projectPaid) {
                $starStatus = 'paid';
                $summary['paid_stars']                  += $stars;
                $projectsMap[$pid]['paid_stars']        += $stars;
            } elseif ($iAwarded) {
                $starStatus = 'earned';
                $summary['accumulated_stars']           += $stars;
                $projectsMap[$pid]['accumulated_stars'] += $stars;
            } else {
                $starStatus = 'missed';
                $summary['missed_stars']                += $stars;
                $projectsMap[$pid]['missed_stars']      += $stars;
            }

            $submission = $submissionsMap[$task->id] ?? null;
            $deadline   = $task->bonusDeadline();

            $projectsMap[$pid]['tasks'][] = [
                'id'             => $task->id,
                'title'          => $task->title,
                'bonus_stars'    => $stars,
                'stage'          => $task->taskStage->name ?? 'No Stage',
                'stage_color'    => $task->taskStage->color ?? null,
                'star_status'    => $starStatus,
                'bonus_deadline' => $deadline?->toDateString(),
                'submission'     => $submission ? [
                    'status'           => $submission->status,
                    'submitted_at'     => $submission->submitted_at?->format('M d, Y'),
                    'notes'            => $submission->notes,
                    'approved_at'      => $submission->approved_at?->format('M d, Y'),
                    'rejection_reason' => $submission->rejection_reason,
                ] : null,
            ];
        }

        return Inertia::render('Taskly/Dashboard/MyStarsDashboard', [
            'summary'  => $summary,
            'projects' => array_values($projectsMap),
        ]);
    }
}
