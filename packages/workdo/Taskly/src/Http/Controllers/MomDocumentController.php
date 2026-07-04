<?php

namespace Workdo\Taskly\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Workdo\Taskly\Models\MomRoom;
use Workdo\Taskly\Models\MomDocument;

class MomDocumentController extends Controller
{
    public function store(Request $request, MomRoom $room)
    {
        $user = Auth::user();

        abort_if($room->created_by !== creatorId(), 403);
        abort_if(in_array($room->status, ['closed', 'archived']), 422);
        abort_if(!$room->isMember($user->id), 403);

        $request->validate([
            'file'         => 'required|file|max:51200', // 50 MB max
            'description'  => 'nullable|string|max:500',
            'access_level' => 'nullable|in:view_only,downloadable,disabled',
        ]);

        $file        = $request->file('file');
        $storedName  = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path        = $file->storeAs("mom/{$room->id}", $storedName, 'local');
        $source      = $user->type === 'client' ? 'client' : 'internal';

        MomDocument::create([
            'room_id'         => $room->id,
            'uploaded_by'     => $user->id,
            'original_name'   => $file->getClientOriginalName(),
            'stored_name'     => $storedName,
            'file_path'       => $path,
            'file_size'       => $file->getSize(),
            'mime_type'       => $file->getMimeType(),
            'access_level'    => $source === 'internal' ? ($request->input('access_level') ?? 'downloadable') : null,
            'version'         => 1,
            'is_latest'       => true,
            'uploader_source' => $source,
            'description'     => $request->input('description'),
            'created_by'      => creatorId(),
        ]);

        return back()->with('success', __('Document uploaded.'));
    }

    public function updateVersion(Request $request, MomDocument $document)
    {
        $user = Auth::user();
        abort_if($user->type === 'client', 403);
        abort_if($document->room->created_by !== creatorId(), 403);

        $request->validate([
            'file'        => 'required|file|max:51200',
            'description' => 'nullable|string|max:500',
        ]);

        // Mark old version as not latest
        $document->update(['is_latest' => false]);

        $file       = $request->file('file');
        $storedName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path       = $file->storeAs("mom/{$document->room_id}", $storedName, 'local');

        MomDocument::create([
            'room_id'            => $document->room_id,
            'uploaded_by'        => $user->id,
            'original_name'      => $file->getClientOriginalName(),
            'stored_name'        => $storedName,
            'file_path'          => $path,
            'file_size'          => $file->getSize(),
            'mime_type'          => $file->getMimeType(),
            'access_level'       => $document->access_level,
            'version'            => $document->version + 1,
            'parent_document_id' => $document->parent_document_id ?? $document->id,
            'is_latest'          => true,
            'uploader_source'    => 'internal',
            'description'        => $request->input('description') ?? $document->description,
            'created_by'         => creatorId(),
        ]);

        return back()->with('success', __('Document updated to new version.'));
    }

    public function updateAccess(Request $request, MomDocument $document)
    {
        $user = Auth::user();
        abort_if($user->type === 'client', 403);
        abort_if($document->room->created_by !== creatorId(), 403);
        abort_if($document->uploader_source === 'client', 422);

        $request->validate(['access_level' => 'required|in:view_only,downloadable,disabled']);
        $document->update(['access_level' => $request->input('access_level')]);

        return back()->with('success', __('Access level updated.'));
    }

    public function serve(MomDocument $document)
    {
        $user = Auth::user();
        abort_if($document->room->created_by !== creatorId(), 403);
        abort_if(!$document->room->isMember($user->id), 403);

        $effectiveAccess = $document->effectiveAccessLevel($user->type);

        if ($effectiveAccess === 'disabled') {
            abort(403, __('Access to this document has been disabled.'));
        }

        $path = storage_path('app/' . $document->file_path);

        if (!file_exists($path)) {
            abort(404);
        }

        $headers = ['Content-Type' => $document->mime_type ?? 'application/octet-stream'];

        if ($effectiveAccess === 'view_only') {
            $headers['Content-Disposition'] = 'inline; filename="' . $document->original_name . '"';
            $headers['X-Content-Type-Options'] = 'nosniff';
        } else {
            $headers['Content-Disposition'] = 'attachment; filename="' . $document->original_name . '"';
        }

        return response()->file($path, $headers);
    }
}
