<?php declare(strict_types=1);

namespace Swag\Example\Storefront;

use Symfony\Component\HttpFoundation\Response;

final class ListingPageController
{
    public function index(): Response
    {
        $response = new Response('listing');
        $response->headers->set('Cache-Control', 'no-store');

        return $response;
    }
}
