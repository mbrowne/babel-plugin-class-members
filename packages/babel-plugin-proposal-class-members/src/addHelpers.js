// @flow
import template from '@babel/template';
import helpers from '@babel/helpers/lib/helpers';

// Copied from https://github.com/babel/babel/blob/master/packages/babel-helpers/src/helpers.js
const helper = (minVersion: string) => tpl => ({
  minVersion,
  ast: () => template.program.ast(tpl),
});

helpers.classInstanceVariableGet = helper('7.0.0')`
  export default function _classInstanceVariableGet(receiver, privateMap) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to get instance variable on non-instance");
    }
    return privateMap.get(receiver).value;
  }
`;

helpers.classInstanceVariableSet = helper('7.0.0')`
  export default function _classInstanceVariableSet(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to set instance variable on non-instance");
    }
    var descriptor = privateMap.get(receiver);
    if (!descriptor.writable) {
      // This should only throw in strict mode, but class bodies are
      // always strict and instance variables can only be used inside
      // class bodies.
      throw new TypeError("attempted to set non-writable instance variable");
    }
    descriptor.value = value;
    return value;
  }
`;
