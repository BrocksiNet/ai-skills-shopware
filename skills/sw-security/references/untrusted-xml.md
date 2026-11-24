# Parsing XML that comes from outside

## Rule

- **SEC-010** **Parse XML your code did not ship with `XmlParser`, not with
  `XmlUtils::parse()` or `XmlUtils::loadFile()`.** `XmlUtils` parses with
  `validateOnParse`, so libxml loads a document's DTD and resolves its
  entities before Symfony rejects the document type. A crafted file can make
  the server read local files and send them out through PHP stream wrappers,
  which `LIBXML_NONET` does not stop (XML external entity injection).
  `Shopware\Core\Framework\Util\XmlParser::parse($content, $schema)` and
  `::loadFile($file, $schema)` take the same arguments, keep the `XmlUtils`
  error messages and reject any document type before `XmlUtils` sees the
  content. That covers uploads, supplier or marketplace feeds, API and
  webhook responses and files of another extension. An XML file your own
  extension ships and nobody can replace, such as a committed fixture or
  config, is no attack surface.

## Which cores have `XmlParser`

`XmlParser` is in 6.6.10.32, 6.7.16.1 and trunk. It is missing from
6.6.10.31 and earlier 6.6 releases and from 6.7.16.0 and earlier 6.7
releases, so on those a call is a fatal error. Raise the extension's
`shopware/core` constraint to a release that has it, or guard with
`class_exists(XmlParser::class)` and refuse the document otherwise. Do not
fall back to `XmlUtils` on an older core.

## Common review failures

- A feed importer or upload handler that calls `XmlUtils::parse()` on the
  response or file content.
- A switch to `XmlParser` in an extension that still supports a core without
  it, with no constraint change and no guard.

## Enforced where

Core's PHPStan rule `NoXmlUtilsParsingRule` reports these two calls in core,
tests excluded. It does not run in an extension.

## Eval

`review-untrusted-xml-catch` / `-ignore` — a supplier feed parsed with
`XmlUtils::parse()`, and the same import parsed with `XmlParser::parse()`.
