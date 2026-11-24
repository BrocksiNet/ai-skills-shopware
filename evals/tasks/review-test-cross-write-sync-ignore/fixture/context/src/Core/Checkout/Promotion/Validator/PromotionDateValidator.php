<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Promotion\Validator;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Shopware\Core\Checkout\Promotion\PromotionDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Write\Command\DeleteCommand;
use Shopware\Core\Framework\DataAbstractionLayer\Write\Validation\PreWriteValidationEvent;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Validation\WriteConstraintViolationException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;

/**
 * @internal
 */
#[Package('checkout')]
class PromotionDateValidator implements EventSubscriberInterface
{
    public const VIOLATION_VALID_UNTIL = 'PROMOTION_VALID_UNTIL_VIOLATION';

    public function __construct(private readonly Connection $connection)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [PreWriteValidationEvent::class => 'validate'];
    }

    public function validate(PreWriteValidationEvent $event): void
    {
        $writes = [];
        foreach ($event->getCommands() as $command) {
            if ($command->getEntityName() !== PromotionDefinition::ENTITY_NAME || $command instanceof DeleteCommand) {
                continue;
            }

            $payload = array_intersect_key($command->getPayload(), ['valid_from' => true, 'valid_until' => true]);
            if ($payload === []) {
                continue;
            }

            $writes[] = [$command->getPrimaryKey()['id'], $command->getPath(), $payload];
        }

        if ($writes === []) {
            return;
        }

        $stored = $this->storedDates(array_unique(array_column($writes, 0)));
        $violations = new ConstraintViolationList();

        foreach ($writes as [$id, $path, $payload]) {
            $dates = $payload + ($stored[$id] ?? []);
            if ($this->endsBeforeStart($dates)) {
                $violations->add($this->violation($path));
            }
        }

        if ($violations->count() > 0) {
            $event->getExceptions()->add(new WriteConstraintViolationException($violations));
        }
    }

    /**
     * @param list<string> $ids
     *
     * @return array<string, array{valid_from: ?string, valid_until: ?string}>
     */
    private function storedDates(array $ids): array
    {
        /** @var array<string, array{valid_from: ?string, valid_until: ?string}> */
        return $this->connection->fetchAllAssociativeIndexed(
            'SELECT id, valid_from, valid_until FROM promotion WHERE id IN (:ids)',
            ['ids' => $ids],
            ['ids' => ArrayParameterType::BINARY],
        );
    }

    /**
     * @param array<string, ?string> $dates
     */
    private function endsBeforeStart(array $dates): bool
    {
        $from = $dates['valid_from'] ?? null;
        $until = $dates['valid_until'] ?? null;

        return $from !== null && $until !== null && new \DateTimeImmutable($until) < new \DateTimeImmutable($from);
    }

    private function violation(string $path): ConstraintViolation
    {
        return new ConstraintViolation(
            'The promotion cannot end before it starts.',
            null,
            [],
            null,
            $path . '/validUntil',
            null,
            null,
            self::VIOLATION_VALID_UNTIL,
        );
    }
}
