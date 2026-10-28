<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Customer\Validation;

use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('checkout')]
class CustomerEmailValidator
{
    public function isValid(?string $email): bool
    {
        if (empty($email)) {
            return false;
        }

        return filter_var($email, \FILTER_VALIDATE_EMAIL) !== false;
    }
}
