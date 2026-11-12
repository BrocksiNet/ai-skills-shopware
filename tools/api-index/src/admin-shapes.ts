// The signatures of an admin component's props, methods and computed
// members, read from its config with the types the source writes down.
// The text formats and the comparison live in member-signature.ts.
import type { Node, ObjectExpression } from '@babel/types';
import { keyOf, propertyOf } from './js.ts';
import {
  type ComputedShape,
  formatComputed,
  formatMethod,
  formatProp,
  type MethodShape,
  type Param,
  type PropShape,
} from './member-signature.ts';

/** The source text of a node, on one line. */
function textOf(node: Node, code: string): string {
  if (node.start === null || node.start === undefined || node.end === null || node.end === undefined) return '';
  return code.slice(node.start, node.end).replaceAll(/\s+/gu, ' ').trim();
}

/** The type of a `: Type` annotation; undefined for none. */
function annotation(node: Node | null | undefined, code: string): string | undefined {
  if (node?.type !== 'TSTypeAnnotation') return undefined;
  const text = textOf(node.typeAnnotation, code);
  return text === '' ? undefined : text;
}

/** A parameter's name: its identifier, or `{}` / `[]` when destructured. */
function nameOf(node: Node): string | undefined {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ObjectPattern') return '{}';
  if (node.type === 'ArrayPattern') return '[]';
  return undefined;
}

function paramOf(node: Node, code: string): Param | undefined {
  const rest = node.type === 'RestElement';
  const defaulted = node.type === 'AssignmentPattern';
  const target = rest ? node.argument : defaulted ? node.left : node;
  const name = nameOf(target);
  if (name === undefined) return undefined;
  const optional = defaulted || (target.type === 'Identifier' && target.optional === true);
  const param: Param = { name, optional, rest };
  // Babel puts a rest parameter's type on the element, the others' on the target.
  const own = rest ? annotation(node.typeAnnotation, code) : undefined;
  const type = own ?? ('typeAnnotation' in target ? annotation(target.typeAnnotation, code) : undefined);
  if (type !== undefined) param.type = type;
  return param;
}

/** The function a method or computed member defines: `name() {}`,
 *  `name: function () {}` or `name: () => …`. */
function functionOf(member: Node): Node | undefined {
  if (member.type === 'ObjectMethod') return member;
  if (member.type !== 'ObjectProperty') return undefined;
  const { value } = member;
  return value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression' ? value : undefined;
}

function shapeOf(fn: Node, code: string): MethodShape | undefined {
  if (fn.type !== 'ObjectMethod' && fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression')
    return undefined;
  const params: Param[] = [];
  for (const node of fn.params) {
    const param = paramOf(node, code);
    if (param === undefined) return undefined;
    params.push(param);
  }
  const shape: MethodShape = { async: fn.async, params };
  const returns = annotation(fn.returnType, code);
  if (returns !== undefined) shape.returns = returns;
  return shape;
}

/** `(a: T, b?: U): R`; '' when a parameter is beyond reading. */
export function methodSignature(member: Node, code: string): string {
  const fn = functionOf(member);
  const shape = fn === undefined ? undefined : shapeOf(fn, code);
  return shape === undefined ? '' : formatMethod(shape);
}

/** `returns T`, `settable`, both, or '' for a computed member. */
export function computedSignature(member: Node, code: string): string {
  const shape: ComputedShape = { settable: false };
  let getter = functionOf(member);
  if (getter === undefined && member.type === 'ObjectProperty' && member.value.type === 'ObjectExpression') {
    const object = member.value;
    const get = object.properties.find((property) => keyOf(property) === 'get');
    getter = get === undefined ? undefined : functionOf(get);
    shape.settable = object.properties.some((property) => keyOf(property) === 'set');
  }
  const returns = getter === undefined ? undefined : shapeOf(getter, code)?.returns;
  if (returns !== undefined) shape.returns = returns;
  return formatComputed(shape);
}

/** The constructors of a prop's `type`: `String`, `[String, Number]`. */
function constructors(node: Node): string[] {
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'ArrayExpression')
    return node.elements.flatMap((element) => (element?.type === 'Identifier' ? [element.name] : []));
  return [];
}

/** `required String`, `optional Object as Entity<'product'>`. */
export function propSignature(value: ObjectExpression, code: string): string {
  const flag = propertyOf(value, 'required');
  const shape: PropShape = { required: flag?.type === 'BooleanLiteral' && flag.value, runtime: [] };
  let type = propertyOf(value, 'type');
  if (type?.type === 'TSAsExpression') {
    const cast = type.typeAnnotation;
    const inner =
      cast.type === 'TSTypeReference' && cast.typeName.type === 'Identifier' && cast.typeName.name === 'PropType'
        ? cast.typeArguments?.params[0]
        : undefined;
    if (inner !== undefined) shape.type = textOf(inner, code);
    type = type.expression;
  }
  if (type !== undefined) shape.runtime = constructors(type);
  if (shape.runtime.length === 0) delete shape.type;
  return formatProp(shape);
}
