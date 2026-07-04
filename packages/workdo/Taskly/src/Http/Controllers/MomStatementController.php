<?php

namespace Workdo\Taskly\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Workdo\Taskly\Models\MomRoom;
use Workdo\Taskly\Models\MomStatement;

class MomStatementController extends Controller
{
    public function store(Request $request, MomRoom $room)
    {
        $user = Auth::user();

        abort_if($room->created_by !== creatorId(), 403);
        abort_if(in_array($room->status, ['closed', 'archived']), 422);
        abort_if(!$room->isMember($user->id), 403);

        $validated = $request->validate([
            'content'   => 'required|string|max:5000',
            'parent_id' => 'nullable|integer|exists:mom_statements,id',
        ]);

        // Validate parent belongs to same room
        if (!empty($validated['parent_id'])) {
            $parent = MomStatement::find($validated['parent_id']);
            abort_if($parent->room_id !== $room->id, 422);
        }

        $slNo = MomStatement::computeSlNo($room->id, $validated['parent_id'] ?? null);

        MomStatement::create([
            'room_id'    => $room->id,
            'parent_id'  => $validated['parent_id'] ?? null,
            'user_id'    => $user->id,
            'content'    => $validated['content'],
            'sl_no'      => $slNo,
            'created_by' => creatorId(),
        ]);

        return back()->with('success', __('Statement posted.'));
    }
}
