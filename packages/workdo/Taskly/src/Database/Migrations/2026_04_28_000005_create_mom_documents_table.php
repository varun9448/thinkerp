<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('mom_rooms')->cascadeOnDelete();
            $table->unsignedBigInteger('uploaded_by');
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type')->nullable();
            // null = client upload (always downloadable by internal); set by internal only
            $table->enum('access_level', ['view_only', 'downloadable', 'disabled'])->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->unsignedBigInteger('parent_document_id')->nullable();
            $table->boolean('is_latest')->default(true);
            $table->enum('uploader_source', ['internal', 'client'])->default('internal');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('parent_document_id')->references('id')->on('mom_documents')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_documents');
    }
};
