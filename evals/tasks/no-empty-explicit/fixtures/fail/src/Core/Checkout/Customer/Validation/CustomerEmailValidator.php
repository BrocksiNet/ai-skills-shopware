<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Customer\Validation;

use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('checkout')]
class CustomerEmailValidator
{
    /**
     * @param list<string> $blockedDomains
     */
    public function __construct(
        private readonly array $blockedDomains = [],
    ) {
    }

    public function isValid(?string $email): bool
    {
        if ($email === null || $email === '') {
            return false;
        }

        if (filter_var($email, \FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        // The new code path still uses empty(); an explicit check elsewhere is not enough.
        if (empty($this->blockedDomains)) {
            return true;
        }

        $domain = mb_strtolower(substr($email, (int) strrpos($email, '@') + 1));

        return !\in_array($domain, array_map(mb_strtolower(...), $this->blockedDomains), true);
    }
}
