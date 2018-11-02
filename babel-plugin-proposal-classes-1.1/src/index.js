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
        const privateNames = new Set();
        const body = path.get('body');
        const instanceVarDecls = [];

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

          // @NB: using t.isInstanceVariableDeclaration() instead of path.isInstanceVariableDeclaration()
          // since we're using a fork of @babel/types. If @babel/core can be made to use our custom fork
          // of @babel/types then this workaround will no longer be necessary.
          //
          // if (path.isInstanceVariableDeclaration()) {
          if (t.isInstanceVariableDeclaration(path)) {
            instanceVarDecls.push(path);
            for (const instanceVar of path.get('declarations')) {
              const {
                key: { name },
              } = instanceVar.node;

              if (privateNames.has(name)) {
                throw path.buildCodeFrameError(
                  'Duplicate class instance variable'
                );
              }
              privateNames.add(name);
              props.push(instanceVar);
            }
          }

          if (path.isClassMethod({ kind: 'constructor' })) {
            constructor = path;
          }

          path.remove();
        } // end for

        if (!props.length) return;

        let ref;
        if (path.isClassExpression() || !path.node.id) {
          nameFunction(path);
          ref = path.scope.generateUidIdentifier('class');
        } else {
          // path.isClassDeclaration() && path.node.id
          ref = path.node.id;
        }

        const computedNodes = [];
        const staticNodes = [];
        const instanceBody = [];

        // Copied from https://github.com/mbrowne/babel/blob/master/packages/babel-plugin-proposal-class-properties/src/index.js
        // Do we need this?
        /*  
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
            // @TODO exclude public (readonly) properties here
            privateMapInits.push(inits);

            privateMaps.push(
              buildClassPrivateInstanceVar(
                path,
                t.thisExpression(),
                prop,
                inits,
                state
              )
            );
          }
        }
        let p = 0;
        for (const prop of props) {
          if (prop.node.static) {
            // @TODO static properties and static instance vars
            //
            // } else if (prop.isInstanceVariable()) {
          } else if (t.isInstanceVariable(prop)) {
            instanceBody.push(privateMaps[p]());
            staticNodes.push(...privateMapInits[p]);
            p++;
          }
        }

        if (instanceBody.length) {
          if (!constructor) {
            const newConstructor = t.classMethod(
              'constructor',
              t.identifier('constructor'),
              [],
              t.blockStatement([])
            );
            if (isDerived) {
              newConstructor.params = [t.restElement(t.identifier('args'))];
              newConstructor.body.body.push(
                t.expressionStatement(
                  t.callExpression(t.super(), [
                    t.spreadElement(t.identifier('args')),
                  ])
                )
              );
            }
            [constructor] = body.unshiftContainer('body', newConstructor);
          }

          const state = { scope: constructor.scope };
          for (const prop of props) {
            if (prop.node.static) continue;
            prop.traverse(referenceVisitor, state);
          }

          if (isDerived) {
            const bareSupers = [];
            constructor.traverse(findBareSupers, bareSupers);
            for (const bareSuper of bareSupers) {
              bareSuper.insertAfter(instanceBody);
            }
          } else {
            constructor.get('body').unshiftContainer('body', instanceBody);
          }
        }

        if (computedNodes.length === 0 && staticNodes.length === 0) return;

        if (path.isClassExpression()) {
          path.scope.push({ id: ref });
          path.replaceWith(
            t.assignmentExpression('=', t.cloneNode(ref), path.node)
          );
        } else if (!path.node.id) {
          // Anonymous class declaration
          path.node.id = ref;
        }

        path.insertBefore(computedNodes);
        path.insertAfter(staticNodes);
      }, // end Class visitor
    },
  };
});

function buildClassPrivateInstanceVar(classPath, ref, path, initNodes, state) {
  const { scope } = path;
  const { name } = path.node.key;
  const {
    parent: { kind },
  } = path;

  const map = scope.generateUidIdentifier(name);
  //TODO
  // memberExpressionToFunctions(classPath, privateNameVisitor, {
  //   name,
  //   map,
  //   file: state,
  //   ...privateNameHandler,
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
          writable: WRITABLE,
          value: VALUE
        });
      `({
      MAP: map,
      WRITABLE: kind === 'let' ? 'true' : 'false',
      REF: ref,
      VALUE:
        (path.node.init && path.node.init.extra.raw) ||
        scope.buildUndefinedNode(),
    });
}
