<?php

namespace App\Models;

use App\Enums\EnvironmentStatus;
use App\Enums\EnvironmentType;
use Database\Factories\EnvironmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Environment extends Model
{
    /** @use HasFactory<EnvironmentFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'name',
        'slug',
        'type',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => EnvironmentType::class,
            'status' => EnvironmentStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return HasMany<ApiCredential, $this>
     */
    public function credentials(): HasMany
    {
        return $this->hasMany(ApiCredential::class);
    }

    /**
     * @return HasMany<DataTable, $this>
     */
    public function dataTables(): HasMany
    {
        return $this->hasMany(DataTable::class);
    }
}
