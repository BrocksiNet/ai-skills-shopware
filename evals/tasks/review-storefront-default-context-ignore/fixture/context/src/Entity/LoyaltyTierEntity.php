<?php declare(strict_types=1);

namespace Swag\Loyalty\Entity;

use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityIdTrait;

class LoyaltyTierEntity extends Entity
{
    use EntityIdTrait;

    protected string $name;

    protected int $minPoints;

    protected ?string $tagId = null;

    public function getName(): string
    {
        return $this->name;
    }

    public function getMinPoints(): int
    {
        return $this->minPoints;
    }

    public function getTagId(): ?string
    {
        return $this->tagId;
    }
}
