<?php declare(strict_types=1);

namespace Swag\LowStockDigest;

use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;
use Shopware\Core\System\SystemConfig\SystemConfigService;

class SwagLowStockDigest extends Plugin
{
    public function uninstall(UninstallContext $uninstallContext): void
    {
        parent::uninstall($uninstallContext);

        if ($uninstallContext->keepUserData()) {
            return;
        }

        $this->container->get(SystemConfigService::class)
            ->deleteExtensionConfiguration('SwagLowStockDigest');
    }
}
