### 1. What and why?

- relates #12345
- CartProcessor cannot be decorated by plugins today, so every cart calculation change needs a core patch.

### 2. How?

- Put cart calculation behind an abstract class that plugins can decorate: `src/Core/Checkout/Cart/AbstractCartProcessor.php` is new, `CartProcessor.php` extends it, and `CartProcessorTest.php` covers it.

#### Impact

- New public class `AbstractCartProcessor`. Plugins that decorate `CartProcessor` must decorate the abstract class instead.

### 3. Testing

1. Install a plugin that decorates `AbstractCartProcessor`.
2. Expected: the decoration runs. Before this change the decoration is ignored.

### 4. Additional notes

- Follow-up: move the existing core decorators to the abstract class.

### 5. Checklist

- [x] I have read and followed the [contribution guidelines](https://github.com/shopware/shopware/blob/trunk/CONTRIBUTING.md#pull-request-checklist)
- [x] **Only** non-obvious code is commented
- [x] Tests added, and they fail without this change
- [x] Release notes updated, if relevant for external developers ([how to document a release](https://github.com/shopware/shopware/blob/trunk/delivery-process/documenting-a-release.md))
- [ ] Documentation and agent skills updated
