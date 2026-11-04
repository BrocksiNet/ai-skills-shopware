<?php declare(strict_types=1);
namespace Acme\Export\Message;

final class ExportBatchMessage
{
    public function __construct(private readonly bool $notify = true) {}
    public function isNotify(): bool { return $this->notify; }
}
