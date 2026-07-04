<?php

namespace Workdo\Taskly\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MomRoomMember extends Model
{
    use HasFactory;

    protected $fillable = ['room_id', 'user_id', 'added_by', 'last_visited_at'];

    protected $casts = ['last_visited_at' => 'datetime'];

    public function room()
    {
        return $this->belongsTo(MomRoom::class, 'room_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
