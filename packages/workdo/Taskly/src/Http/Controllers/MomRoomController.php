<?php

namespace Workdo\Taskly\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\User;
use Workdo\Taskly\Models\Project;
use Workdo\Taskly\Models\MomRoom;
use Workdo\Taskly\Models\MomRoomMember;
use Workdo\Taskly\Models\MomStatement;
use Workdo\Taskly\Models\MomDocument;

class MomRoomController extends Controller
{
    public function index(Project $project)
    {
        $user      = Auth::user();
        $creatorId = creatorId();

        abort_if($project->created_by !== $creatorId, 403);

        $rooms = MomRoom::where('project_id', $project->id)
            ->where('created_by', $creatorId)
            ->with(['members'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($room) use ($user) {
                return [
                    'id'              => $room->id,
                    'name'            => $room->name,
                    'description'     => $room->description,
                    'status'          => $room->status,
                    'member_count'    => $room->members->count(),
                    'statement_count' => MomStatement::where('room_id', $room->id)->count(),
                    'pending_ack'     => $room->isMember($user->id) ? $room->pendingAckCountFor($user->id) : 0,
                    'unread'          => $room->isMember($user->id) ? $room->unreadCountFor($user->id) : 0,
                    'is_member'       => $room->isMember($user->id),
                    'created_at'      => $room->created_at->format('M d, Y'),
                ];
            });

        // Eligible users to add to rooms (all users under this company)
        $eligibleUsers = User::where('created_by', $creatorId)
            ->select('id', 'name', 'email', 'type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Taskly/Mom/Index', [
            'project'       => ['id' => $project->id, 'name' => $project->name],
            'rooms'         => $rooms,
            'eligibleUsers' => $eligibleUsers,
            'canManage'     => $user->can('manage-project'),
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($project->created_by !== creatorId(), 403);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'required|string',
            'member_ids'  => 'array',
            'member_ids.*'=> 'integer|exists:users,id',
        ]);

        $room = MomRoom::create([
            'project_id'  => $project->id,
            'name'        => $validated['name'],
            'description' => $validated['description'],
            'creator_id'  => $user->id,
            'created_by'  => creatorId(),
        ]);

        // Always add the creator as a member
        $memberIds = collect($validated['member_ids'] ?? [])->push($user->id)->unique()->all();
        foreach ($memberIds as $memberId) {
            MomRoomMember::create([
                'room_id'  => $room->id,
                'user_id'  => $memberId,
                'added_by' => $user->id,
            ]);
        }

        return back()->with('success', __('Room created successfully.'));
    }

    public function show(MomRoom $room)
    {
        $user      = Auth::user();
        $creatorId = creatorId();

        abort_if($room->created_by !== $creatorId, 403);
        abort_if(!$room->isMember($user->id) && !$user->can('manage-project'), 403);

        // Mark last visited
        MomRoomMember::where('room_id', $room->id)
            ->where('user_id', $user->id)
            ->update(['last_visited_at' => now()]);

        // Build statement tree
        $flatStatements = MomStatement::where('room_id', $room->id)
            ->with(['user:id,name,email,type', 'acknowledgments.user:id,name'])
            ->orderBy('created_at')
            ->get()
            ->map(function ($s) use ($user) {
                $myAck = $s->acknowledgments->firstWhere('user_id', $user->id);
                return [
                    'id'               => $s->id,
                    'parent_id'        => $s->parent_id,
                    'sl_no'            => $s->sl_no,
                    'content'          => $s->content,
                    'user_id'          => $s->user_id,
                    'user'             => [
                        'id'   => $s->user->id,
                        'name' => $s->user->name,
                        'type' => $s->user->type,
                    ],
                    'created_at'       => $s->created_at->format('M d, Y H:i'),
                    'my_ack'           => $myAck ? [
                        'type'    => $myAck->type,
                        'remarks' => $myAck->remarks,
                    ] : null,
                    'all_acks'         => $s->acknowledgments->map(fn($a) => [
                        'user_name' => $a->user->name,
                        'type'      => $a->type,
                        'remarks'   => $a->remarks,
                    ])->values()->all(),
                    'children'         => [],
                ];
            })
            ->all();

        $statementTree = MomStatement::buildTree($flatStatements);

        // Documents
        $documents = MomDocument::where('room_id', $room->id)
            ->where('is_latest', true)
            ->with('uploader:id,name,type')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($d) => [
                'id'              => $d->id,
                'original_name'   => $d->original_name,
                'description'     => $d->description,
                'file_size'       => $d->file_size,
                'mime_type'       => $d->mime_type,
                'access_level'    => $d->access_level,
                'uploader_source' => $d->uploader_source,
                'uploader_name'   => $d->uploader->name,
                'version'         => $d->version,
                'created_at'      => $d->created_at->format('M d, Y'),
                'effective_access'=> $d->effectiveAccessLevel($user->type),
            ]);

        // Members
        $members = MomRoomMember::where('room_id', $room->id)
            ->with('user:id,name,email,type')
            ->get()
            ->map(fn($m) => [
                'id'   => $m->user->id,
                'name' => $m->user->name,
                'type' => $m->user->type,
            ]);

        // Eligible users to add
        $existingMemberIds = $members->pluck('id')->all();
        $eligibleUsers = User::where('created_by', $creatorId)
            ->whereNotIn('id', $existingMemberIds)
            ->select('id', 'name', 'email', 'type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Taskly/Mom/Room', [
            'room'           => [
                'id'          => $room->id,
                'name'        => $room->name,
                'description' => $room->description,
                'status'      => $room->status,
                'project'     => ['id' => $room->project->id, 'name' => $room->project->name],
            ],
            'statements'     => $statementTree,
            'documents'      => $documents,
            'members'        => $members,
            'eligibleUsers'  => $eligibleUsers,
            'pendingAckCount'=> $room->pendingAckCountFor($user->id),
            'isInternal'     => $user->type !== 'client',
            'canManage'      => $user->can('manage-project'),
            'ackTypes'       => MomStatement::ACK_TYPES,
        ]);
    }

    public function update(Request $request, MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);
        abort_if($room->status !== 'active', 422, __('Only active rooms can be edited.'));

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'required|string',
        ]);

        $room->update($validated);
        return back()->with('success', __('Room updated successfully.'));
    }

    public function close(MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);

        $room->update(['status' => 'closed']);
        return back()->with('success', __('Room closed.'));
    }

    public function reopen(MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);

        $room->update(['status' => 'active']);
        return back()->with('success', __('Room reopened.'));
    }

    public function addMember(Request $request, MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);

        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);

        MomRoomMember::firstOrCreate(
            ['room_id' => $room->id, 'user_id' => $validated['user_id']],
            ['added_by' => $user->id]
        );

        return back()->with('success', __('Member added.'));
    }

    public function removeMember(Request $request, MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);

        $validated = $request->validate(['user_id' => 'required|integer']);

        // Cannot remove the room creator
        abort_if($validated['user_id'] == $room->creator_id, 422);

        MomRoomMember::where('room_id', $room->id)
            ->where('user_id', $validated['user_id'])
            ->delete();

        return back()->with('success', __('Member removed.'));
    }

    public function archive(MomRoom $room)
    {
        $user = Auth::user();
        abort_if(!$user->can('manage-project'), 403);
        abort_if($room->created_by !== creatorId(), 403);
        abort_if($room->status === 'archived', 422);

        $room->update(['status' => 'archived']);
        return back()->with('success', __('Room archived. It is now read-only.'));
    }

    public function allRooms(Request $request)
    {
        $user      = Auth::user();
        $creatorId = creatorId();

        $query = MomRoom::where('created_by', $creatorId)
            ->with(['project:id,name', 'members.user:id,name,type'])
            ->withCount('statements');

        // Staff and clients only see rooms they belong to
        if (!$user->can('manage-project')) {
            $query->whereHas('members', fn($m) => $m->where('user_id', $user->id));
        }

        $rooms = $query->orderByDesc('updated_at')->get()->map(function ($room) use ($user) {
            $clients = $room->members
                ->filter(fn($m) => $m->user && $m->user->type === 'client')
                ->map(fn($m) => $m->user->name)
                ->values()->all();

            return [
                'id'              => $room->id,
                'name'            => $room->name,
                'description'     => $room->description,
                'status'          => $room->status,
                'project_id'      => $room->project_id,
                'project_name'    => $room->project->name ?? '—',
                'clients'         => $clients,
                'member_count'    => $room->members->count(),
                'statement_count' => $room->statements_count,
                'pending_ack'     => $room->isMember($user->id) ? $room->pendingAckCountFor($user->id) : 0,
                'unread'          => $room->isMember($user->id) ? $room->unreadCountFor($user->id) : 0,
                'is_member'       => $room->isMember($user->id),
                'updated_at'      => $room->updated_at->format('M d, Y'),
            ];
        });

        // Build project list for filter
        $projectIds = $rooms->pluck('project_id')->unique()->all();
        $projects   = Project::whereIn('id', $projectIds)->select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Taskly/Mom/AllRooms', [
            'rooms'     => $rooms,
            'projects'  => $projects,
            'canManage' => $user->can('manage-project'),
        ]);
    }
}
