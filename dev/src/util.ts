/*!
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {FieldPath, validateFieldPath} from './path';
import {DocumentReference, validateDocumentReference} from './reference';
import {isPlainObject} from './serializer';
import {ReadOptions} from './types';
import {createErrorDescription} from './validate';

/**
 * Generate a unique client-side identifier.
 *
 * Used for the creation of new documents.
 *
 * @private
 * @returns {string} A unique 20-character wide identifier.
 */
export function autoId(): string {
  const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}

/**
 * Generate a short and semi-random client-side identifier.
 *
 * Used for the creation of request tags.
 *
 * @private
 * @returns {string} A random 5-character wide identifier.
 */
export function requestTag(): string {
  return autoId().substr(0, 5);
}

/**
 * Parses the arguments for the `getAll()` call supported by both the Firestore
 * and Transaction class.
 *
 * @private
 * @param documentRefsOrReadOptions An array of document references followed by
 * an optional ReadOptions object.
 */
export function parseGetAllArguments(
    documentRefsOrReadOptions: Array<DocumentReference|ReadOptions>):
    {documents: DocumentReference[], fieldMask: FieldPath[]|null} {
  let documents: DocumentReference[];
  let readOptions: ReadOptions|undefined = undefined;

  // In the original release of the SDK, getAll() was documented to accept
  // either a varargs list of DocumentReferences or a single array of
  // DocumentReferences. To support this usage in the TypeScript client, we have
  // to manually verify the arguments to determine which input the user
  // provided.
  const usesDeprecatedArgumentStyle =
      Array.isArray(documentRefsOrReadOptions[0]);

  if (usesDeprecatedArgumentStyle) {
    documents = documentRefsOrReadOptions[0] as DocumentReference[];
    readOptions = documentRefsOrReadOptions[1] as ReadOptions;
  } else {
    if (documentRefsOrReadOptions.length > 0 &&
        isPlainObject(
            documentRefsOrReadOptions[documentRefsOrReadOptions.length - 1])) {
      readOptions = documentRefsOrReadOptions.pop() as ReadOptions;
      documents = documentRefsOrReadOptions as DocumentReference[];
    } else {
      documents = documentRefsOrReadOptions as DocumentReference[];
    }
  }

  for (let i = 0; i < documents.length; ++i) {
    validateDocumentReference(i, documents[i]);
  }

  validateReadOptions('options', readOptions);
  const fieldMask = readOptions && readOptions.fieldMask ?
      readOptions.fieldMask.map(
          fieldPath => FieldPath.fromArgument(fieldPath)) :
      null;
  return {fieldMask, documents};
}



/**
 * Validates the use of 'options' as ReadOptions and enforces that 'fieldMask'
 * is an array of strings or field paths.
 *
 * @private
 * @param options.fieldMask - The subset of fields to return from a read
 * operation.
 */
export function validateReadOptions(arg: number|string, val?: unknown): void {
  if (val !== undefined) {
    if (typeof val !== 'object' && val === null) {
      throw new Error(`${
          createErrorDescription(
              arg, 'read option')} Input is not an object.'`);
    }

    const options = val as {[k: string]: unknown};

    if (options.fieldMask === undefined) {
    }

    if (!Array.isArray(options.fieldMask)) {
      throw new Error(`${
          createErrorDescription(
              arg, 'read option')} "fieldMask" is not an array.`);
    }

    for (let i = 0; i < options.fieldMask.length; ++i) {
      try {
        validateFieldPath(i, options.fieldMask[i]);
      } catch (err) {
        throw new Error(`${
            createErrorDescription(
                arg, 'read option')} "fieldMask" is not valid: ${err.message}`);
      }
    }
  }
}
