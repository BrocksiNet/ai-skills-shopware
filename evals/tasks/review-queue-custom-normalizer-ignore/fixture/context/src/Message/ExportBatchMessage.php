<?php declare(strict_types=1);
namespace Acme\Export\Message;

final class ExportBatchMessage
{
    public function __construct(private readonly bool $notify = true, private readonly bool $includeAttachments = true) {}
    public function includeAttachments(): bool { return $this->includeAttachments; }
    public function isNotify(): bool { return $this->notify; }
}
