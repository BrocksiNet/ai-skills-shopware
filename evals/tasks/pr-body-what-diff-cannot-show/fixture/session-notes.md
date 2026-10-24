# Notes: cart processor extension point

- Tried a plain decorator on CartProcessor first. The container rejected it:
  the concrete class has no interface of its own to decorate.
- Then I checked the storefront and plugin extensions in the repo. None of
  them type-hint the concrete class, so the process() signature can stay.
- Went with an abstract class with the same process() signature. CartProcessor
  keeps implementing CartProcessorInterface, so existing type hints still work.
- The first version of the test used a mock of CartProcessor and passed for
  the wrong reason. Rewrote it to call the subclass directly.
- Cart integration tests pass locally: 412 green.
- Still to do: move the core decorators to the abstract class. Decide in 6.8
  whether CartProcessorInterface gets deprecated.
