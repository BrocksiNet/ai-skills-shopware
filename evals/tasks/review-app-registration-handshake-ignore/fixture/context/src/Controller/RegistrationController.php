<?php declare(strict_types=1);

namespace SwagSyncBackend\Controller;

use SwagSyncBackend\Shop\ShopRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class RegistrationController
{
    public function __construct(
        private string $appName,
        private string $appSecret,
        private string $confirmationUrl,
        private ShopRepository $shops,
    ) {
    }

    public function confirm(Request $request): Response
    {
        $payload = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        if (!\is_array($payload) || !\is_string($payload['shopId'] ?? null) || !\is_string($payload['apiKey'] ?? null) || !\is_string($payload['secretKey'] ?? null)) {
            return new JsonResponse(['error' => 'Invalid payload'], Response::HTTP_BAD_REQUEST);
        }

        $shop = $this->shops->findByShopId($payload['shopId']);
        if ($shop === null) {
            return new JsonResponse(['error' => 'Unknown shop'], Response::HTTP_NOT_FOUND);
        }

        $signature = $request->headers->get('shopware-shop-signature');
        $expected = hash_hmac('sha256', $request->getContent(), $shop->secret);
        if (!\is_string($signature) || !hash_equals($expected, $signature)) {
            return new JsonResponse(['error' => 'Invalid signature'], Response::HTTP_UNAUTHORIZED);
        }

        $this->shops->saveCredentials($payload['shopId'], $payload['apiKey'], $payload['secretKey']);

        return new Response('', Response::HTTP_NO_CONTENT);
    }
}
