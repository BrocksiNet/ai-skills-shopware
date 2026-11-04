<?php declare(strict_types=1);
namespace Acme\Export\Serializer;
use Acme\Export\Message\ExportBatchMessage;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Serializer\Normalizer\DenormalizerInterface;
final class ExportBatchNormalizer implements NormalizerInterface, DenormalizerInterface
{
    public function normalize(mixed $data, ?string $format = null, array $context = []): array
    {
        return ['notify' => $data->isNotify(), 'includeAttachments' => $data->includeAttachments()];
    }
    public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): ExportBatchMessage
    {
        return new ExportBatchMessage(notify: $data['notify'], includeAttachments: $data['includeAttachments']);
    }
    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool { return $data instanceof ExportBatchMessage; }
    public function supportsDenormalization(mixed $data, string $type, ?string $format = null, array $context = []): bool { return $type === ExportBatchMessage::class; }
    public function getSupportedTypes(?string $format): array { return [ExportBatchMessage::class => true]; }
}
