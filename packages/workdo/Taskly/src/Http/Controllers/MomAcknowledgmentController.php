<?php

namespace Workdo\Taskly\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Workdo\Taskly\Models\MomStatement;
use Workdo\Taskly\Models\MomAcknowledgment;

class MomAcknowledgmentController extends Controller
{
    public function store(Request $request, MomStatement $statement)
    {
        $user = Auth::user();
        $room = $statement->room;

        abort_if($room->created_by !== creatorId(), 403);
        abort_if(!$room->isMember($user->id), 403);
        abort_if($statement->user_id === $user->id, 422); // cannot ack own statement

        $needsRemarks = in_array($request->input('type'), ['accepted_with_remarks', 'rejected_with_remarks']);

        $validated = $request->validate([
            'type'    => 'required|in:' . implode(',', array_keys(MomStatement::ACK_TYPES)),
            'remarks' => $needsRemarks ? 'required|string|max:2000' : 'nullable|string|max:2000',
        ]);

        MomAcknowledgment::updateOrCreate(
            ['statement_id' => $statement->id, 'user_id' => $user->id],
            [
                'type'       => $validated['type'],
                'remarks'    => $validated['remarks'] ?? null,
                'created_by' => creatorId(),
            ]
        );

        return back()->with('success', __('Acknowledgment saved.'));
    }
}
