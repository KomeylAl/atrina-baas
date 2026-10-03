<?php

namespace App\Models;

use App\Enums\DataPolicyOperation;
use App\Enums\DataPolicySubject;
use Database\Factories\DataPolicyFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataPolicy extends Model
{
    /** @use HasFactory<DataPolicyFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'data_table_id',
        'operation',
        'subject',
        'policy_definition',
        'enabled',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'operation' => DataPolicyOperation::class,
            'subject' => DataPolicySubject::class,
            'policy_definition' => 'array',
            'enabled' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<DataTable, $this>
     */
    public function dataTable(): BelongsTo
    {
        return $this->belongsTo(DataTable::class);
    }
}
