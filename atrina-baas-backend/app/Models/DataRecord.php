<?php

namespace App\Models;

use Database\Factories\DataRecordFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataRecord extends Model
{
    /** @use HasFactory<DataRecordFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'environment_id',
        'data_table_id',
        'owner_id',
        'data',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    /**
     * @return BelongsTo<DataTable, $this>
     */
    public function dataTable(): BelongsTo
    {
        return $this->belongsTo(DataTable::class);
    }

    /**
     * @return BelongsTo<ProjectUser, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(ProjectUser::class, 'owner_id');
    }
}
