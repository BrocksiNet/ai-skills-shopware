import assert from 'node:assert/strict';
import { test } from 'node:test';
import { constantsOf } from '../src/constants.ts';
import { definitionNames, entityItems } from '../src/entities.ts';
import { type FieldClass, fieldClasses } from '../src/field-classes.ts';
import type { Item } from '../src/model.ts';
import { markSchema, routeItems, schemaOperations } from '../src/http.ts';

function byId(items: Item[]): Map<string, Item> {
  return new Map(items.map((item) => [item.id, item]));
}

function get(items: Map<string, Item>, id: string): Item {
  const found = items.get(id);
  assert.ok(found, `no item ${id}`);
  return found;
}

const CONTROLLER = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Demo;

use Shopware\\Core\\Framework\\Feature;
use Shopware\\Core\\Framework\\Routing\\StoreApiRouteScope;
use Shopware\\Core\\PlatformRequest;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

/**
 * @internal
 */
#[Route(defaults: [PlatformRequest::ATTRIBUTE_ROUTE_SCOPE => [StoreApiRouteScope::ID]])]
class DemoRoute
{
    final public const NAME = 'store-api.demo.list';

    #[Route(path: '/store-api/demo', name: self::NAME, methods: [Request::METHOD_GET, 'POST'])]
    public function list(): void {}

    /**
     * @deprecated tag:v6.8.0 - use list() instead
     */
    #[Route(path: 'store-api/demo/old', name: 'store-api.demo.old', methods: ['GET'])]
    public function old(): void {}

    /*
     * @deprecated tag:v6.8.0 - a plain comment, not a docblock
     */
    #[Route(path: '/store-api/demo/plain', name: 'store-api.demo.plain', methods: ['GET'])]
    public function plain(): void {}

    #[Route(path: '/store-api/demo/trigger', name: 'store-api.demo.trigger', methods: ['GET'])]
    public function trigger(Request $request): void
    {
        Feature::triggerDeprecationOrThrow('v6.8.0.0', 'gone');
    }

    #[Route(path: '/store-api/demo/post', name: 'store-api.demo.post', methods: ['GET', 'POST'])]
    public function post(Request $request): void
    {
        if ($request->isMethod('POST')) {
            Feature::triggerDeprecationOrThrow('v6.8.0.0', 'POST is deprecated');
        }
    }
}
`;

/** The constants of the demo controller, as the build passes them. */
function controllerConstants(): (constant: string) => string | undefined {
  return constantsOf(new Map([['Demo.php', CONTROLLER]]), new Map([['Shopware\\Core\\Demo\\DemoRoute', 'Demo.php']]));
}

test('routes: names from constants, methods from Request constants, scope, leading slash, flags', () => {
  const items = byId(routeItems(CONTROLLER, 'src/Core/Demo/DemoRoute.php', controllerConstants()));
  const list = get(items, 'route:store-api.demo.list');
  assert.equal(list.signature, 'GET|POST /store-api/demo');
  assert.equal(list.scope, 'store-api');
  // A controller's @internal is about the PHP class, not the route.
  assert.deepEqual(list.flags, {});
  const old = get(items, 'route:store-api.demo.old');
  assert.equal(old.signature, 'GET /store-api/demo/old');
  assert.equal(old.flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'route:store-api.demo.plain').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'route:store-api.demo.trigger').flags.deprecated, 'v6.8.0');
  // A deprecation under a request check is about the request, not the route.
  assert.equal(get(items, 'route:store-api.demo.post').flags.deprecated, undefined);
});

function lookup(constant: string): string | undefined {
  return constant === 'Shopware\\Core\\Demo\\Names::ROUTE' ? 'frontend.demo' : undefined;
}

test('routes: a name in another class constant is resolved through the lookup', () => {
  const code = `<?php
namespace Shopware\\Storefront\\Demo;
use Shopware\\Core\\Demo\\Names;
use Symfony\\Component\\Routing\\Attribute\\Route;
class DemoController {
    #[Route(path: '/demo', name: Names::ROUTE, methods: ['GET'])]
    public function show(): void {}
}`;
  assert.deepEqual(
    routeItems(code, 'x.php', lookup).map((route) => route.id),
    ['route:frontend.demo'],
  );
});

test('OpenAPI: a documented operation marks the route, placeholders by position', () => {
  const routes = routeItems(CONTROLLER, 'x.php', controllerConstants());
  const json = JSON.stringify({ paths: { '/demo': { get: {}, post: {} }, '/other/{id}': { get: {} } } });
  const operations = schemaOperations(json, '/store-api');
  assert.deepEqual(operations, ['GET /store-api/demo', 'POST /store-api/demo', 'GET /store-api/other/{id}']);
  markSchema(routes, operations);
  const marked = byId(routes);
  assert.equal(get(marked, 'route:store-api.demo.list').schema, true);
  assert.equal(get(marked, 'route:store-api.demo.old').schema, undefined);
});

const FIELDS = `<?php
namespace Shopware\\Core\\Framework\\DataAbstractionLayer\\Field;
class Field {}
class StringField extends Field {
    public function __construct(string $storageName, string $propertyName, int $maxLength = 255) {}
}
class EmailField extends StringField {}
class NameField extends StringField {
    public function __construct(string $storageName, string $propertyName) { parent::__construct($storageName, $propertyName, 100); }
}
class IdField extends Field {
    public function __construct(string $storageName, string $propertyName) {}
}
class FkField extends Field {
    public function __construct(string $storageName, string $propertyName, string $referenceClass) {}
}
class ReferenceVersionField extends FkField {
    public function __construct(string $definition, ?string $storageName = null) {}
}
class CreatedAtField extends Field {
    public function __construct() { parent::__construct('created_at', 'createdAt'); }
}
`;

function classes(): Map<string, FieldClass> {
  return fieldClasses(FIELDS, 'Field.php');
}

const DEFINITION = `<?php
namespace Shopware\\Core\\Demo;
use Shopware\\Core\\Framework\\DataAbstractionLayer\\Field\\{EmailField, FkField, IdField, NameField, ReferenceVersionField, StringField};
use Shopware\\Core\\Framework\\DataAbstractionLayer\\Field\\Flag\\{ApiAware, Deprecated, PrimaryKey, Required, WriteProtected};
use Shopware\\Core\\Framework\\Feature;
use Shopware\\Core\\Content\\Product\\ProductDefinition;

class DemoDefinition extends EntityDefinition {
    public const ENTITY_NAME = 'demo';

    protected function defineFields(): FieldCollection {
        $stock = (new StringField('stock', 'stock'))->addFlags(new ApiAware());
        if (Feature::isActive('v6.8.0.0')) {
            $stock->addFlags(new WriteProtected());
        }
        $fields = new FieldCollection([
            (new IdField('id', 'id'))->addFlags(new PrimaryKey(), new Required()),
            (new FkField('product_id', 'productId', ProductDefinition::class))->addFlags(new ApiAware()),
            new ReferenceVersionField(ProductDefinition::class),
            (new NameField('name', 'name'))->addFlags(new ApiAware()),
            Feature::isActive('v6.8.0.0') ? new EmailField('mail', 'mail') : new StringField('mail', 'mail'),
            (new StringField('old', 'old'))->addFlags(new Deprecated('v6.7.0.0', 'v6.8.0.0')),
            $stock,
        ]);
        if (!Feature::isActive('v6.8.0.0')) {
            $fields->add(new StringField('label', 'label'));
        }
        return $fields;
    }
}
`;

test('entity fields: property names through constructors, flags, references', () => {
  const definitions = definitionNames(DEFINITION, 'x.php');
  definitions.set('Shopware\\Core\\Content\\Product\\ProductDefinition', 'product');
  const result = entityItems(DEFINITION, 'x.php', classes(), definitions);
  assert.deepEqual(result.unreadable, []);
  const items = byId(result.items);
  assert.equal(get(items, 'entity:demo').signature, 'DemoDefinition');
  assert.equal(get(items, 'field:demo.id').signature, 'IdField PrimaryKey Required');
  assert.equal(get(items, 'field:demo.productId').signature, 'FkField →Product ApiAware');
  // Named after the entity it points at.
  assert.ok(items.has('field:demo.productVersionId'));
  // Forwarded through NameField's own constructor.
  assert.equal(get(items, 'field:demo.name').signature, 'NameField ApiAware');
  assert.equal(get(items, 'field:demo.old').flags.deprecated, 'v6.8.0');
});

test('entity fields: what ships is the flag-off branch; a flag that changes or drops a field deprecates it', () => {
  const items = byId(entityItems(DEFINITION, 'x.php', classes(), new Map()).items);
  assert.equal(get(items, 'field:demo.mail').signature, 'StringField');
  assert.equal(get(items, 'field:demo.mail').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'field:demo.stock').signature, 'StringField ApiAware');
  assert.equal(get(items, 'field:demo.stock').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'field:demo.label').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'field:demo.name').flags.deprecated, undefined);
});

function member(id: string): [string, Item] {
  return [id, { id, kind: 'property', file: 'DemoEntity.php', flags: { deprecated: 'v6.9.0' } }];
}

test('entity fields: a deprecated property or getter on the entity class deprecates the field', () => {
  const members = new Map([
    member('php:Shopware\\Core\\Demo\\DemoEntity::$name'),
    member('php:Shopware\\Core\\Demo\\DemoEntity::getProductId()'),
  ]);
  const items = byId(entityItems(DEFINITION, 'x.php', classes(), new Map(), members).items);
  assert.equal(get(items, 'field:demo.name').flags.deprecated, 'v6.9.0');
  assert.equal(get(items, 'field:demo.productId').flags.deprecated, 'v6.9.0');
  assert.equal(get(items, 'field:demo.id').flags.deprecated, undefined);
});

test('entity fields: default createdAt and updatedAt, none for a mapping definition', () => {
  const items = byId(entityItems(DEFINITION, 'x.php', classes(), new Map()).items);
  assert.equal(get(items, 'field:demo.createdAt').signature, 'CreatedAtField ApiAware');
  assert.ok(items.has('field:demo.updatedAt'));
  const mapping = DEFINITION.replace('extends EntityDefinition', 'extends MappingEntityDefinition');
  assert.ok(!byId(entityItems(mapping, 'x.php', classes(), new Map()).items).has('field:demo.createdAt'));
});

test('entity names: a name built from another class constant', () => {
  const owner = `<?php
namespace Shopware\\Core\\Demo;
class DemoDefinition { public const ENTITY_NAME = 'demo'; }`;
  const translation = `<?php
namespace Shopware\\Core\\Demo;
class DemoTranslationDefinition {
    public const ENTITY_NAME = DemoDefinition::ENTITY_NAME . '_translation';
    protected function defineFields(): FieldCollection { return new FieldCollection([]); }
}`;
  const files = new Map([
    ['Demo.php', owner],
    ['DemoTranslation.php', translation],
  ]);
  const constants = constantsOf(
    files,
    new Map([
      ['Shopware\\Core\\Demo\\DemoDefinition', 'Demo.php'],
      ['Shopware\\Core\\Demo\\DemoTranslationDefinition', 'DemoTranslation.php'],
    ]),
  );
  assert.deepEqual([...definitionNames(translation, 'DemoTranslation.php', constants).values()], ['demo_translation']);
});
