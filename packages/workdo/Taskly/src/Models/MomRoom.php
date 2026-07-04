<?php

namespace Workdo\Taskly\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MomRoom extends Model
{
    use HasFactory;

    protected $fillable = ['project_id', 'name', 'description', 'status', 'creator_id', 'created_by'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function members()
    {
        return $this->hasMany(MomRoomMember::class, 'room_id');
    }

    public function memberUsers()
    {
        return $this->belongsToMany(User::class, 'mom_room_members', 'room_id', 'user_id');
    }

    public function statements()
    {
        return $this->hasMany(MomStatement::class, 'room_id')->orderBy('created_at');
    }

    public function rootStatements()
    {
        return $this->hasMany(MomStatement::class, 'room_id')->whereNull('parent_id')->orderBy('created_at');
    }

    public function documents()
    {
        return $this->hasMany(MomDocument::class, 'room_id')->where('is_latest', true)->orderBy('created_at');
    }

    public function isMember(int $userId): bool
    {
        return $this->members()->where('user_id', $userId)->exists();
    }

    public function pendingAckCountFor(int $userId): int
    {
        return MomStatement::where('room_id', $this->id)
            ->where('user_id', '!=', $userId)
            ->whereNotIn('id', function ($q) use ($userId) {
                $q->select('statement_id')
                  ->from('mom_acknowledgments')
                  ->where('user_id', $userId);
            })
            ->count();
    }

    public function unreadCountFor(int $userId): int
    {
        $member = $this->members()->where('user_id', $userId)->first();
        if (!$member || !$member->last_visited_at) {
            return $this->statements()->where('user_id', '!=', $userId)->count();
        }
        return $this->statements()
            ->where('user_id', '!=', $userId)
            ->where('created_at', '>', $member->last_visited_at)
            ->count();
    }
}
