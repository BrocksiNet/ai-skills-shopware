<?php declare(strict_types=1);
use Shopware\Core\Kernel;
use Symfony\Component\HttpFoundation\Request;
$kernel = new Kernel('prod', false);
foreach ($requests as $request) {
    $response = $kernel->handle($request);
    $kernel->terminate($request, $response);
}
