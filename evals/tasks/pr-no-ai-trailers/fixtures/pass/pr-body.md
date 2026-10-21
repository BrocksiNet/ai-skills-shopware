### 1. What and why?

- relates #12345
- CartProcessor cannot be decorated by plugins today.

### 2. How?

- Make CartProcessor extensible so plugins can decorate cart calculation.

#### Impact

- New abstract class `AbstractCartProcessor`; plugins decorate it instead of the concrete class.

### 3. Testing

1. Install a plugin that needs to decorate CartProcessor.
2. The decoration is ignored.

### 4. Additional notes

- Follow-up: move the existing decorators in core to the abstract class.

### 5. Checklist

- [x] I have read and followed the [contribution guidelines](https://github.com/shopware/shopware/blob/trunk/CONTRIBUTING.md#pull-request-checklist)
- [x] **Only** non-obvious code is commented
- [x] Tests added, and they fail without this change
- [x] Release notes updated, if relevant for external developers ([how to document a release](https://github.com/shopware/shopware/blob/trunk/delivery-process/documenting-a-release.md))
- [ ] Documentation and agent skills updated
