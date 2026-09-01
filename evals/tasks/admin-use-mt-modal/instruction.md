# Task: use mt-modal instead of a raw dialog

`product-delete-modal/index.ts` renders a native `<dialog>`. Administration
UI must use Meteor / existing Admin components.

- Replace the raw `<dialog>` with `mt-modal` (or the `sw-modal` already used
  in this module if you must stay consistent).
- Do not leave a native `<dialog>` or Popover API in the template.
