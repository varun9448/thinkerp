<?php

namespace Workdo\Taskly\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MomAcknowledgment extends Model
{
    use HasFactory;

    protected $fillable = ['statement_id', 'user_id', 'type', 'remarks', 'created_by'];

    public function statement()
    {
        return $this->belongsTo(MomStatement::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
