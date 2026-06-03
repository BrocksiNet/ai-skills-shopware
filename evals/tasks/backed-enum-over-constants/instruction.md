The file `fixture/OrderStatus.php` models a fixed set of order states as string
class constants. Refactor it into a backed `enum` (`string`) and update any
obvious usage so the value set is type-safe.

Keep the same string values ("open", "paid", "cancelled") so persisted data
stays compatible.
