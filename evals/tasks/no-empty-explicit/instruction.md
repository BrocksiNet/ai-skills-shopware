# Task: block email domains at customer registration (core)

You are working on Shopware core (`shopware/shopware` trunk).
`CustomerEmailValidator` in `src/Core/Checkout/Customer/Validation/` decides
whether a registration email is accepted. Shop owners want to reject
addresses from a configurable list of blocked domains.

Give the validator the list of blocked domains (an empty list blocks nothing)
and reject an email whose domain is on the list, ignoring case. Everything
else is accepted or rejected as today. Leave the service wiring to us.
