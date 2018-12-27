/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {FieldPath} from './path';

/**
 * Formats the given word as plural conditionally given the preceding number.
 *
 * @private
 */
function formatPlural(num, str) {
  return `${num} ${str}` + (num === 1 ? '' : 's');
}

export interface AllowOptional {
  optional?: boolean;
}

export interface AllowRange {
  minValue?: number;
  maxValue?: number;
}

function formatArgumentName(arg: string|number) {
  return typeof arg === 'string' ? `"${arg}"` : `at index ${arg}`;
}

function isOptional(value: unknown, options?: AllowOptional): boolean {
  return value === undefined && options !== undefined &&
      options.optional === true;
}

function isFunction(val:unknown) {
  return val && {}.toString.call(val) === '[object Function]';
}

export function createErrorDescription(
    arg: string|number, expectedType: string) {
  return `Argument ${formatArgumentName(arg)} is not a valid ${expectedType}.`;
}

export function validateFunction(
    arg: string|number, value: unknown, options?: AllowOptional): void {
  if (!isOptional(value, options)) {
  if (!isFunction(value))
      { throw new Error(createErrorDescription(arg, 'function')); }
  }
}

export function validateObject(
    arg: string|number, value: unknown, options?: AllowOptional): void {
  if (!isOptional(value, options)) {
    if (typeof value !== 'object' && value === null) {
      throw new Error(createErrorDescription(arg, 'object'));
    }
  }
}

export function validateString(
    arg: string|number, value: unknown, options?: AllowOptional): void {
  if (!isOptional(value, options)) {
    if (typeof value !== 'string') {
      throw new Error(createErrorDescription(arg, 'string'));
    }
  }
}

export function validateBoolean(
    arg: string|number, value: unknown, options?: AllowOptional): void {
  if (!isOptional(value, options)) {
    if (typeof value !== 'boolean') {
      throw new Error(createErrorDescription(arg, 'boolean'));
    }
  }
}

export function validateNumber(
    arg: string|number, value: unknown,
    options?: AllowOptional&AllowRange): void {
  const min = options !== undefined && options.minValue !== undefined ?
      options.minValue :
      -Infinity;
  const max = options !== undefined && options.maxValue !== undefined ?
      options.maxValue :
      -Infinity;

  if (!isOptional(value, options)) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(createErrorDescription(arg, 'number'));
    }
    if (value < min || value > max) {
      throw new Error(
          `Value for argument ${formatArgumentName(arg)} must be within [${
              min}, ${max}] inclusive, but was: ${value}`);
    }
  }
}

export function validateInteger(
    arg: string|number, value: unknown,
    options?: AllowOptional&AllowRange): void {
  const min = options !== undefined && options.minValue !== undefined ?
      options.minValue :
      -Infinity;
  const max = options !== undefined && options.maxValue !== undefined ?
      options.maxValue :
      Infinity;

  if (!isOptional(value, options)) {
    if (typeof value !== 'number' ||isNaN(value) || value % 1 !== 0) {
      throw new Error(createErrorDescription(arg, 'integer'));
    }
    if (value < min || value > max) {
      throw new Error(
          `Value for argument ${formatArgumentName(arg)} must be within [${
              min}, ${max}] inclusive, but was: ${value}`);
    }
  }
}

/**
 * Verifies that 'args' has at least 'minSize' elements.
 *
 * @private
 * @param funcName The function name to use in the error message.
 * @param args The array (or array-like structure) to verify.
 * @param  minSize The minimum number of elements to enforce.
 * @throws if the expectation is not met.
 */
export function validateMinNumberOfArguments(funcName, args, minSize): void {
  if (args.length < minSize) {
    throw new Error(
        `Function "${funcName}()" requires at least ` +
        `${formatPlural(minSize, 'argument')}.`);
  }
}

/**
 * Verifies that 'args' has at most 'maxSize' elements.
 *
 * @private
 * @param funcName The function name to use in the error message.
 * @param  args The array (or array-like structure) to verify.
 * @param  maxSize The maximum number of elements to enforce.
 * @throws if the expectation is not met.
 */
export function validateMaxNumberOfArguments(funcName, args, maxSize): void {
  if (args.length > maxSize) {
    throw new Error(
        `Function "${funcName}()" accepts at most ` +
        `${formatPlural(maxSize, 'argument')}.`);
  }
}

/**
 * Validates that the provided named option equals one of the expected values.
 *
 * @private
 */
export function validatePropertyValue(
    arg: string|number, val: unknown, values: string[],
    options?: AllowOptional): void {
  if (!isOptional(val, options)) {
    const expectedDescription: string[] = [];

    for (const allowed of values) {
      if (allowed === val) {
        return;
      }
      expectedDescription.push(allowed);
    }

    throw new Error(`Invalid value for argument ${
        formatArgumentName(
            arg)}. Acceptable values are: ${expectedDescription.join(', ')}`);
  }
}

export function customObjectMessage(
    argumentName: string|number, val, path?: FieldPath): string {
  const fieldPathMessage = path ? ` (found in field ${path.toString()})` : '';

  if (typeof val === 'object' && val !== null) {
    const typeName = val.constructor.name;
    switch (typeName) {
      case 'DocumentReference':
      case 'FieldPath':
      case 'FieldValue':
      case 'GeoPoint':
      case 'Timestamp':
        return `${
                   createErrorDescription(
                       argumentName,
                       'Firestore document')} Detected an object of type "${
                   typeName}" that doesn't match the ` +
            `expected instance${fieldPathMessage}. Please ensure that the ` +
            'Firestore types you are using are from the same NPM package.)';
      default:
        return `${
                   createErrorDescription(
                       argumentName,
                       'Firestore document')} Couldn't serialize object of type "${
                   typeName}"${
                   fieldPathMessage}. Firestore doesn't support JavaScript ` +
            'objects with custom prototypes (i.e. objects that were created ' +
            'via the "new" operator).';
    }
  } else {
    return `${
        createErrorDescription(
            argumentName, 'Firestore document')} Invalid use of type "${
        typeof val}" as a Firestore argument${fieldPathMessage}.`;
  }
}
