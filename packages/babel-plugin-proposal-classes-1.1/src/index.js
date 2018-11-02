import { declare } from '@babel/helper-plugin-utils';
import nameFunction from '@babel/helper-function-name';
import syntaxClasses11 from '@babel/plugin-syntax-classes-1.1';
import { template, traverse } from '@babel/core';
import * as t from '@babel/types';
import { environmentVisitor } from '@babel/helper-replace-supers';
import memberExpressionToFunctions from '@babel/helper-member-expression-to-functions';
import optimiseCall from '@babel/helper-optimise-call-expression';

export default declare((api, options) => {
  api.assertVersion(7);

  const findBareSupers = traverse.visitors.merge([
    {
      Super(path) {
        const { node, parentPath } = path;
        if (parentPath.isCallExpression({ callee: node })) {
          this.push(parentPath);
        }
      },
    },
    environmentVisitor,
  ]);

  const referenceVisitor = {
    'TSTypeAnnotation|TypeAnnotation'(path) {
      path.skip();
    },

    ReferencedIdentifier(path) {
      if (this.scope.hasOwnBinding(path.node.name)) {
        this.scope.rename(path.node.name);
        path.skip();
      }
    },
  };

  // temporal dead zone visitor
  const classVariableDefinitionEvaluationTDZVisitor = traverse.visitors.merge([
    {
      ReferencedIdentifier(path) {
        if (
          this.classBinding &&
          this.classBinding === path.scope.getBinding(path.node.name)
        ) {
          const classNameTDZError = this.file.addHelper('classNameTDZError');
          const throwNode = t.callExpression(classNameTDZError, [
            t.stringLiteral(path.node.name),
          ]);

          path.replaceWith(t.sequenceExpression([throwNode, path.node]));
          path.skip();
        }
      },
    },
    environmentVisitor,
  ]);

  return {
    inherits: syntaxClasses11,

    visitor: {
      Class(path, state) {
        const isDerived = !!path.node.superClass;
        let constructor;
        const props = [];
        const computedPaths = [];
        // const instanceVarDeclarations = [];
        const privateNames = new Set();
        const body = path.get('body');

        for (const path of body.get('body')) {
          const { computed, decorators } = path.node;
          if (computed) {
            computedPaths.push(path);
          }
          if (decorators && decorators.length > 0) {
            throw path.buildCodeFrameError(
              'Decorators transform is necessary.'
            );
          }

          if (t.isInstanceVariableDeclaration(path)) {
            // instanceVarDeclarations.push(path);
            const { kind, declarations } = path.node;
            for (const declarator of path.get('declarations')) {
              const {
                key: { name },
              } = declarator;

              if (privateNames.has(name)) {
                throw path.buildCodeFrameError(
                  'Duplicate class instance variable'
                );
              }
              privateNames.add(name);
              props.push(declarator);
            }
          }

          if (path.isProperty()) {
            props.push(path);
          } else if (path.isClassMethod({ kind: 'constructor' })) {
            constructor = path;
          }

          if (!props.length) return;

          let ref;
          if (path.isClassExpression() || !path.node.id) {
            nameFunction(path);
            ref = path.scope.generateUidIdentifier('class');
          } else {
            // path.isClassDeclaration() && path.node.id
            ref = path.node.id;
          }

          // Copied from https://github.com/mbrowne/babel/blob/master/packages/babel-plugin-proposal-class-properties/src/index.js
          // Do we need this?
          /*
          const computedNodes = [];
          const staticNodes = [];
          const instanceBody = [];
  
          for (const computedPath of computedPaths) {
            computedPath.traverse(classFieldDefinitionEvaluationTDZVisitor, {
              classBinding:
                path.node.id && path.scope.getBinding(path.node.id.name),
              file: this.file,
            });
  
            const computedNode = computedPath.node;
            // Make sure computed property names are only evaluated once (upon class definition)
            // and in the right order in combination with static properties
            if (!computedPath.get("key").isConstantExpression()) {
              const ident = path.scope.generateUidIdentifierBasedOnNode(
                computedNode.key,
              );
              computedNodes.push(
                t.variableDeclaration("var", [
                  t.variableDeclarator(ident, computedNode.key),
                ]),
              );
              computedNode.key = t.cloneNode(ident);
            }
          }
          */

          // Transform private props before publics.
          const privateMaps = [];
          const privateMapInits = [];
          for (const prop of props) {
            // if (prop.isInstanceVariable()) {
            if (t.isInstanceVariable(prop)) {
              const inits = [];
              privateMapInits.push(inits);

              privateMaps.push(
                buildClassPrivateInstanceVar(
                  t.thisExpression(),
                  prop,
                  inits,
                  state
                )
              );
            }
          }

          // TEMP
          // for (const declPath of instanceVarDeclarations) {
          //   declPath.remove();
          // }

          if (path.isClassExpression()) {
            path.scope.push({ id: ref });
            path.replaceWith(
              t.assignmentExpression('=', t.cloneNode(ref), path.node)
            );
          } else if (!path.node.id) {
            // Anonymous class declaration
            path.node.id = ref;
          }

          // TEMP
          // path.remove();
          //
        } // end for
      }, // end Class visitor
    },
  };
});

function buildClassPrivateInstanceVar(ref, path, initNodes, state) {
  const { parentPath, scope } = path;
  const { name } = path.node.key;
  console.log('name: ', name);

  const map = scope.generateUidIdentifier(name);
  //TODO
  // memberExpressionToFunctions(parentPath, privateNameVisitor, {
  //   name,
  //   map,
  //   file: state,
  //   ...privateNameHandlerSpec,
  // });

  initNodes.push(
    template.statement`var MAP = new WeakMap();`({
      MAP: map,
    })
  );

  // Must be late evaluated in case it references another private instance variable.
  return () =>
    template.statement`
        MAP.set(REF, {
          // configurable is always false for private elements
          // enumerable is always false for private elements
          writable: true,
          value: VALUE
        });
      `({
      MAP: map,
      REF: ref,
      VALUE: path.node.value || scope.buildUndefinedNode(),
    });
}
