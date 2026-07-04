<?php

namespace Workdo\Taskly\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MomStatement extends Model
{
    use HasFactory;

    protected $fillable = ['room_id', 'parent_id', 'user_id', 'content', 'sl_no', 'created_by'];

    public const ACK_TYPES = [
        'agree'                 => 'Agree',
        'accepted'              => 'Accepted',
        'rejected'              => 'Rejected',
        'pending_decision'      => 'Pending Decision',
        'accepted_with_remarks' => 'Accepted with Remarks',
        'rejected_with_remarks' => 'Rejected with Remarks',
    ];

    public function room()
    {
        return $this->belongsTo(MomRoom::class);
    }

    public function parent()
    {
        return $this->belongsTo(MomStatement::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(MomStatement::class, 'parent_id')->orderBy('created_at');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function acknowledgments()
    {
        return $this->hasMany(MomAcknowledgment::class, 'statement_id');
    }

    public static function computeSlNo(int $roomId, ?int $parentId): string
    {
        if ($parentId === null) {
            $count = self::where('room_id', $roomId)->whereNull('parent_id')->count();
            return (string) ($count + 1);
        }

        $parent = self::find($parentId);
        $count  = self::where('room_id', $roomId)->where('parent_id', $parentId)->count();
        return $parent->sl_no . '.' . ($count + 1);
    }

    public static function buildTree(array $flat, ?int $parentId = null): array
    {
        $nodes = [];
        foreach ($flat as $item) {
            if ($item['parent_id'] === $parentId) {
                $item['children'] = self::buildTree($flat, $item['id']);
                $nodes[] = $item;
            }
        }
        return $nodes;
    }
}
