<?php declare(strict_types=1);

namespace Swag\Loyalty\Export;

use League\Flysystem\FilesystemOperator;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;

#[Package('checkout')]
class PointsCsvExporter
{
    public function __construct(
        private readonly FilesystemOperator $privateFilesystem,
        private readonly PointsCsvWriter $writer,
    ) {
    }

    public function export(string $path, Context $context): string
    {
        $this->privateFilesystem->write($path, $this->writer->render($context));

        return $path;
    }
}
