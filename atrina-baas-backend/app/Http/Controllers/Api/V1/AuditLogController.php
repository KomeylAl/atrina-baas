<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\Project;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function index(Project $project): AnonymousResourceCollection
    {
        $this->authorize('viewAuditLogs', $project);

        $logs = AuditLog::query()
            ->where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->paginate(50);

        return AuditLogResource::collection($logs);
    }
}
