<?php

namespace App\Models;

use App\Enums\IdentityProvider;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserIdentity extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_user_id',
        'project_id',
        'environment_id',
        'provider',
        'provider_subject',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => IdentityProvider::class,
        ];
    }

    /**
     * @return BelongsTo<ProjectUser, $this>
     */
    public function projectUser(): BelongsTo
    {
        return $this->belongsTo(ProjectUser::class);
    }
}
