<?php declare(strict_types=1);
namespace Shopware\Core;
use Shopware\Core\Framework\Feature;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
class Kernel extends \Symfony\Component\HttpKernel\Kernel
{
    public function handle(Request $request, int $type = self::MAIN_REQUEST, bool $catch = true): Response
    {
        $this->boot();
        if (!Feature::isActive('LONGRUNNING_ENVIRONMENT') || $this->getContainer()->has('http_cache')) {
            return $this->getHttpKernel()->handle($request, $type, $catch);
        }
        return parent::handle($request, $type, $catch);
    }
}
