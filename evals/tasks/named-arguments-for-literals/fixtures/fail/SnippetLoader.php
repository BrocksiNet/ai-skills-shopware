<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

final class SnippetLoader
{
    public function dump(bool $strict, int $limit, ?string $fallback): int
    {
        $items = $this->collect($strict, $limit, $fallback);

        return count($items);
    }

    /**
     * @return list<string>
     */
    private function collect(bool $strict, int $limit, ?string $fallback): array
    {
        return $this->dump(strict: false, limit: 10, fallback: 'x') > 0 ? [] : [];
    }
}
