# Babel Plugins for Class Members Proposal

This repo contains two experimental plugins enabling support for the [class members](https://github.com/rdking/proposal-class-members) proposal:

- babel-plugin-syntax-class-members (syntax plugin)
- babel-plugin-proposal-class-members (transform plugin)

> IMPORTANT NOTE: The class members proposal is still evolving, and the syntax supported by these plugins might not always match what is documented at https://github.com/rdking/proposal-class-members.

## Building

```bash
yarn
yarn build
```

Or to build and watch for file changes:

```bash
yarn watch
```

## Usage

Currently the simplest way to use these plugins is to create new files in the `examples` directory, which is already set up to use the custom forks of @babel/parser and @babel/types that the plugins depend on.

Then you can build the examples as follows:

```bash
cd examples
yarn build
```
