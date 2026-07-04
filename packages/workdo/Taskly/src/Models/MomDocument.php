<?php

namespace Workdo\Taskly\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MomDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id', 'uploaded_by', 'original_name', 'stored_name', 'file_path',
        'file_size', 'mime_type', 'access_level', 'version', 'parent_document_id',
        'is_latest', 'uploader_source', 'description', 'created_by',
    ];

    protected $casts = [
        'is_latest' => 'boolean',
        'file_size' => 'integer',
        'version'   => 'integer',
    ];

    public function room()
    {
        return $this->belongsTo(MomRoom::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function parentDocument()
    {
        return $this->belongsTo(MomDocument::class, 'parent_document_id');
    }

    public function versions()
    {
        return $this->hasMany(MomDocument::class, 'parent_document_id')->orderBy('version', 'desc');
    }

    public function effectiveAccessLevel(string $viewerType): string
    {
        if ($this->uploader_source === 'client') {
            return 'downloadable'; // clients' files are always fully accessible to internal
        }
        return $this->access_level ?? 'downloadable';
    }
}
