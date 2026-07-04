<?php

namespace Workdo\Taskly\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Schema;
use Workdo\Taskly\Models\TaskStage;
use Workdo\Taskly\Models\TaskWorkSubmission;
use App\Models\User;

class ProjectTask extends Model
{
    use HasFactory;

    private static ?bool $hasSubmissionsTable = null;

    private static function submissionsTableExists(): bool
    {
        if (self::$hasSubmissionsTable === null) {
            self::$hasSubmissionsTable = Schema::hasTable('task_work_submissions');
        }
        return self::$hasSubmissionsTable;
    }

    protected $fillable = [
        'project_id',
        'milestone_id',
        'title',
        'priority',
        'bonus_stars',
        'bonus_lead_days',
        'assigned_to',
        'duration',
        'description',
        'stage_id',
        'completed_at',
        'bonus_awarded_at',
        'bonus_awarded_to',
        'creator_id',
        'created_by',
    ];

    protected $casts = [
        'bonus_stars' => 'decimal:2',
        'bonus_lead_days' => 'integer',
        'completed_at' => 'datetime',
        'bonus_awarded_at' => 'datetime',
        'bonus_awarded_to' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    public function taskStage()
    {
        return $this->belongsTo(TaskStage::class, 'stage_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedUsers()
    {
        return User::whereIn('id', $this->assignedUserIds())->get();
    }

    public function getAssignedUserIdsAttribute()
    {
        return $this->assignedUserIds();
    }

    public function assignedUserIds(): array
    {
        if (empty($this->assigned_to)) {
            return [];
        }

        if (is_array($this->assigned_to)) {
            $ids = $this->assigned_to;
        } else {
            $decoded = json_decode($this->assigned_to, true);
            $ids = is_array($decoded) ? $decoded : explode(',', (string) $this->assigned_to);
        }

        return collect($ids)
            ->map(fn ($id) => (string) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function bonusDeadline(): ?Carbon
    {
        [$startDate, $endDate] = $this->durationDates();

        if ($startDate && $this->bonus_lead_days !== null) {
            return $startDate->copy()->addDays((int) $this->bonus_lead_days)->endOfDay();
        }

        return $endDate ? $endDate->endOfDay() : null;
    }

    public function syncBonusCompletion(?TaskStage $stage = null): void
    {
        $stage = $stage ?: $this->taskStage;

        // Bonus locked once payroll has paid it out
        if ($this->bonus_awarded_at && $this->project && $this->project->bonus_paid_at) {
            return;
        }

        if (!$stage || !$stage->complete) {
            $this->completed_at = null;
            $this->bonus_awarded_at = null;
            $this->bonus_awarded_to = null;
            return;
        }

        $completedAt = $this->completed_at ? Carbon::parse($this->completed_at) : now();
        $this->completed_at = $completedAt;

        if ((float) $this->bonus_stars <= 0) {
            $this->bonus_awarded_at = null;
            $this->bonus_awarded_to = null;
            return;
        }

        $deadline = $this->bonusDeadline();

        // Manager-approval based system: award stars only to approved, on-time submissions
        if (self::submissionsTableExists()) {
            $query = TaskWorkSubmission::where('task_id', $this->id)
                ->where('status', 'approved')
                ->select(['user_id', 'approved_at']);

            if ($deadline) {
                $query->where('submitted_at', '<=', $deadline);
            }

            $approvedSubmissions = $query->get();

            if ($approvedSubmissions->isEmpty()) {
                // No approved on-time submissions yet — stars stay pending
                $this->bonus_awarded_at = null;
                $this->bonus_awarded_to = null;
                return;
            }

            $this->bonus_awarded_to = $approvedSubmissions
                ->pluck('user_id')
                ->map(fn($id) => (string) $id)
                ->values()
                ->all();
            $this->bonus_awarded_at = $approvedSubmissions->max('approved_at') ?? now();
            return;
        }

        // Fallback (no submission table): old equal-split behaviour
        $assignedUserIds = $this->assignedUserIds();
        $isWithinLeadTime = !$deadline || $completedAt->lessThanOrEqualTo($deadline);

        if ($isWithinLeadTime && count($assignedUserIds) > 0) {
            $this->bonus_awarded_at = $completedAt;
            $this->bonus_awarded_to = $assignedUserIds;
            return;
        }

        $this->bonus_awarded_at = null;
        $this->bonus_awarded_to = null;
    }

    private function durationDates(): array
    {
        if (!$this->duration || strpos($this->duration, ' - ') === false) {
            return [null, null];
        }

        [$start, $end] = array_map('trim', explode(' - ', $this->duration, 2));

        try {
            return [Carbon::parse($start), Carbon::parse($end)];
        } catch (\Exception $e) {
            return [null, null];
        }
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class, 'task_id');
    }

    public function subtasks()
    {
        return $this->hasMany(TaskSubtask::class, 'task_id');
    }
}
