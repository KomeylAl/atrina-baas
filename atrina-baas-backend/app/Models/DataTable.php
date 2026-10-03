<?php

namespace App\Models;

use App\Enums\DataTableStatus;
use Database\Factories\DataTableFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataTable extends Model
{
    /** @use HasFactory<DataTableFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'environment_id',
        'name',
        'display_name',
        'schema_definition',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'schema_definition' => 'array',
            'status' => DataTableStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Environment, $this>
     */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return HasMany<DataPolicy, $this>
     */
    public function policies(): HasMany
    {
        return $this->hasMany(DataPolicy::class);
    }

    /**
     * @return HasMany<DataRecord, $this>
     */
    public function records(): HasMany
    {
        return $this->hasMany(DataRecord::class);
    }

    public function isActive(): bool
    {
        return $this->status === DataTableStatus::Active;
    }
}
