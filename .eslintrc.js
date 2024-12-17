const builtinRules = {
  // region Best Practices

  // https://eslint.org/docs/rules/accessor-pairs
  'accessor-pairs': 'off',

  // https://eslint.org/docs/rules/array-callback-return
  'array-callback-return': ['error', { allowImplicit: true }],

  // https://eslint.org/docs/rules/block-scoped-var
  'block-scoped-var': 'error',

  // TODO: consider enabling
  // https://eslint.org/docs/rules/complexity
  complexity: ['warn', 20],

  // https://eslint.org/docs/rules/class-methods-use-this
  'class-methods-use-this': ['warn', { exceptMethods: [] }],

  // https://eslint.org/docs/rules/consistent-return
  'consistent-return': 'off',

  // https://eslint.org/docs/rules/curly
  curly: ['warn', 'multi-line'], // multiline

  // https://eslint.org/docs/rules/default-case
  'default-case': 'warn',

  // https://eslint.org/docs/rules/default-case-last
  'default-case-last': 'error',

  // https://eslint.org/docs/rules/default-param-last
  'default-param-last': 'error',

  // https://eslint.org/docs/rules/dot-notation
  'dot-notation': 'warn',
  // 'dot-notation': ['warn', { allowKeywords: true }],

  // https://eslint.org/docs/rules/dot-location
  'dot-location': ['warn', 'property'],

  // https://eslint.org/docs/rules/eqeqeq
  eqeqeq: ['warn', 'always', { null: 'ignore' }],

  // https://eslint.org/docs/rules/grouped-accessor-pairs
  'grouped-accessor-pairs': 'warn',

  // irrelevant from ES2022
  // https://eslint.org/docs/rules/guard-for-in
  'guard-for-in': 'off',

  // enforce a maximum number of classes per file
  // https://eslint.org/docs/rules/max-classes-per-file
  // 'max-classes-per-file': ['error', 1],
  // Off by ZI - we do want to allow it for DTOs and small types // todo: consider enabling
  'max-classes-per-file': 'off',

  // https://eslint.org/docs/rules/no-alert
  'no-alert': 'error',

  // https://eslint.org/docs/rules/no-caller
  'no-caller': 'error',

  // https://eslint.org/docs/rules/no-case-declarations
  'no-case-declarations': 'warn',

  // https://eslint.org/docs/rules/no-constructor-return
  'no-constructor-return': 'error',

  // https://eslint.org/docs/rules/no-div-regex
  'no-div-regex': 'off',

  // https://eslint.org/docs/rules/no-else-return
  'no-else-return': ['warn', { allowElseIf: false }],

  // https://eslint.org/docs/rules/no-empty-function
  'no-empty-function': ['warn', { allow: ['arrowFunctions', 'functions', 'methods'] }],

  // https://eslint.org/docs/rules/no-empty-pattern
  'no-empty-pattern': 'warn',

  // https://eslint.org/docs/latest/rules/no-empty-static-block
  'no-empty-static-block': 'warn',

  // https://eslint.org/docs/rules/no-eq-null
  'no-eq-null': 'off',

  // https://eslint.org/docs/rules/no-eval
  'no-eval': 'error',

  // https://eslint.org/docs/rules/no-extend-native
  'no-extend-native': 'warn',

  // https://eslint.org/docs/rules/no-extra-bind
  'no-extra-bind': 'warn',

  // https://eslint.org/docs/rules/no-extra-label
  'no-extra-label': 'error',

  // https://eslint.org/docs/rules/no-fallthrough
  'no-fallthrough': 'error',

  // https://eslint.org/docs/rules/no-floating-decimal
  'no-floating-decimal': 'warn',

  // https://eslint.org/docs/rules/no-global-assign
  'no-global-assign': ['error', { exceptions: [] }],

  // https://eslint.org/docs/rules/no-native-reassign
  'no-native-reassign': 'off',

  // https://eslint.org/docs/rules/no-implicit-coercion
  'no-implicit-coercion': ['off', { boolean: false, number: true, string: true, allow: [] }],

  // https://eslint.org/docs/rules/no-implicit-globals
  'no-implicit-globals': 'off',

  // https://eslint.org/docs/rules/no-implied-eval
  'no-implied-eval': 'error',

  // https://eslint.org/docs/rules/no-invalid-this
  'no-invalid-this': 'warn',

  // https://eslint.org/docs/rules/no-iterator
  'no-iterator': 'error',

  // https://eslint.org/docs/rules/no-labels
  'no-labels': ['error', { allowLoop: false, allowSwitch: false }],

  // https://eslint.org/docs/rules/no-lone-blocks
  'no-lone-blocks': 'error',

  // https://eslint.org/docs/rules/no-loop-func
  'no-loop-func': 'error',

  // https://eslint.org/docs/rules/no-magic-numbers
  'no-magic-numbers': ['off', { ignore: [], ignoreArrayIndexes: true, enforceConst: true, detectObjects: false }],

  // https://eslint.org/docs/rules/no-multi-spaces
  'no-multi-spaces': 'warn',
  // 'no-multi-spaces': ['warn', { ignoreEOLComments: false }],

  // https://eslint.org/docs/rules/no-multi-str
  'no-multi-str': 'error',

  // TODO: make error?
  // https://eslint.org/docs/rules/no-new
  'no-new': 'warn',

  // https://eslint.org/docs/rules/no-new-func
  'no-new-func': 'error',

  // https://eslint.org/docs/rules/no-new-wrappers
  'no-new-wrappers': 'error',

  // https://eslint.org/docs/rules/no-nonoctal-decimal-escape
  'no-nonoctal-decimal-escape': 'error',

  // https://eslint.org/docs/latest/rules/no-object-constructor
  'no-object-constructor': 'error',

  // https://eslint.org/docs/rules/no-octal
  'no-octal': 'error',

  // https://eslint.org/docs/rules/no-octal-escape
  'no-octal-escape': 'error',

  // rule: https://eslint.org/docs/rules/no-param-reassign
  'no-param-reassign': 'warn',
  //   [
  //   'warn',
  //   {
  //     props: true,
  //     ignorePropertyModificationsFor: [
  //       'acc', // for reduce accumulators
  //       'accumulator', // for reduce accumulators
  //       'e', // for e.returnvalue
  //       'ctx', // for Koa routing
  //       'context', // for Koa routing
  //       'req', // for Express requests
  //       'request', // for Express requests
  //       'res', // for Express responses
  //       'response', // for Express responses
  //       '$scope', // for Angular 1 scopes
  //       'staticContext', // for ReactRouter context
  //     ],
  //   },
  // ],

  // disallow usage of __proto__ property
  // https://eslint.org/docs/rules/no-proto
  'no-proto': 'error',

  // disallow declaring the same variable more than once
  // https://eslint.org/docs/rules/no-redeclare
  'no-redeclare': 'error',

  // disallow use of assignment in return statement
  // https://eslint.org/docs/rules/no-return-assign
  // TODO: make error?
  'no-return-assign': ['warn', 'except-parens'], // except-parens / always

  // disallow redundant `return await`
  // https://eslint.org/docs/rules/no-return-await
  'no-return-await': 'error',

  // disallow use of `javascript:` urls.
  // https://eslint.org/docs/rules/no-script-url
  'no-script-url': 'error',

  // disallow self assignment
  // https://eslint.org/docs/rules/no-self-assign
  'no-self-assign': ['error', { props: true }],

  // disallow comparisons where both sides are exactly the same
  // https://eslint.org/docs/rules/no-self-compare
  'no-self-compare': 'error',

  // disallow use of comma operator
  // https://eslint.org/docs/rules/no-sequences
  'no-sequences': 'error',

  // https://eslint.org/docs/rules/no-throw-literal
  'no-throw-literal': 'error',

  // https://eslint.org/docs/rules/no-unmodified-loop-condition
  'no-unmodified-loop-condition': 'off',

  // https://eslint.org/docs/rules/no-unused-expressions
  'no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: false, allowTaggedTemplates: false }],

  // https://eslint.org/docs/rules/no-unused-labels
  'no-unused-labels': 'error',

  // https://eslint.org/docs/rules/no-useless-call
  'no-useless-call': 'warn',

  // https://eslint.org/docs/rules/no-useless-catch
  'no-useless-catch': 'warn',

  // https://eslint.org/docs/rules/no-useless-concat
  'no-useless-concat': 'warn',

  // disallow unnecessary string escaping
  'no-useless-escape': 'warn',

  // https://eslint.org/docs/rules/no-useless-return
  'no-useless-return': 'warn',

  // https://eslint.org/docs/rules/no-void
  'no-void': 'error',

  // https://eslint.org/docs/rules/no-warning-comments
  'no-warning-comments': ['off', { terms: ['todo', 'fixme', 'xxx'], location: 'start' }],

  // https://eslint.org/docs/rules/no-with
  'no-with': 'error',

  // https://eslint.org/docs/rules/prefer-promise-reject-errors
  'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],

  // https://eslint.org/docs/rules/prefer-named-capture-group
  'prefer-named-capture-group': 'off',

  // https://eslint.org/docs/rules/prefer-object-has-own
  'prefer-object-has-own': 'warn',

  // https://eslint.org/docs/rules/prefer-regex-literals
  'prefer-regex-literals': ['warn', { disallowRedundantWrapping: true }],

  // https://eslint.org/docs/rules/radix
  radix: ['error', 'as-needed'],

  // https://eslint.org/docs/rules/require-await
  'require-await': 'off',

  // https://eslint.org/docs/rules/require-unicode-regexp
  'require-unicode-regexp': 'off',

  // https://eslint.org/docs/rules/vars-on-top
  'vars-on-top': 'warn',

  // note: should be aligned with prettier
  // https://eslint.org/docs/rules/wrap-iife
  'wrap-iife': ['warn', 'inside', { functionPrototypeMethods: false }],

  // https://eslint.org/docs/rules/yoda
  yoda: 'off',

  // endregion

  // region Errors

  // https://eslint.org/docs/rules/for-direction
  'for-direction': 'error',

  // https://eslint.org/docs/rules/getter-return
  'getter-return': ['error', { allowImplicit: true }],

  // https://eslint.org/docs/rules/no-async-promise-executor
  'no-async-promise-executor': 'error',

  // https://eslint.org/docs/rules/no-await-in-loop
  // off by ZI
  'no-await-in-loop': 'off',

  // https://eslint.org/docs/rules/no-compare-neg-zero
  'no-compare-neg-zero': 'error',

  // https://eslint.org/docs/rules/no-cond-assign
  'no-cond-assign': ['error', 'always'],

  // disallow use of console
  'no-console': 'warn',

  // https://eslint.org/docs/rules/no-constant-binary-expression
  'no-constant-binary-expression': 'error',

  // https://eslint.org/docs/rules/no-constant-condition
  'no-constant-condition': 'error',

  // https://eslint.org/docs/rules/no-control-regex
  'no-control-regex': 'error',

  // https://eslint.org/docs/rules/no-debugger
  'no-debugger': 'error',

  // https://eslint.org/docs/rules/no-dupe-args
  'no-dupe-args': 'error',

  // https://eslint.org/docs/rules/no-dupe-else-if
  'no-dupe-else-if': 'error',

  // https://eslint.org/docs/rules/no-dupe-keys
  'no-dupe-keys': 'error',

  // https://eslint.org/docs/rules/no-duplicate-case
  'no-duplicate-case': 'error',

  // https://eslint.org/docs/rules/no-empty
  'no-empty': ['error', { allowEmptyCatch: true }],

  // https://eslint.org/docs/rules/no-empty-character-class
  'no-empty-character-class': 'error',

  // https://eslint.org/docs/rules/no-ex-assign
  'no-ex-assign': 'error',

  // https://eslint.org/docs/rules/no-extra-boolean-cast
  'no-extra-boolean-cast': 'error',

  // https://eslint.org/docs/rules/no-extra-parens
  'no-extra-parens': [
    'off',
    'all',
    {
      conditionalAssign: true,
      nestedBinaryExpressions: false,
      returnAssign: false,
      ignoreJSX: 'all', // delegate to eslint-plugin-react
      enforceForArrowConditionals: false,
    },
  ],

  // https://eslint.org/docs/rules/no-extra-semi
  'no-extra-semi': 'warn',

  // https://eslint.org/docs/rules/no-func-assign
  'no-func-assign': 'error',

  // https://eslint.org/docs/rules/no-import-assign
  'no-import-assign': 'error',

  // https://eslint.org/docs/rules/no-inner-declarations
  'no-inner-declarations': 'error',

  // disallow invalid regular expression strings in the RegExp constructor
  // https://eslint.org/docs/rules/no-invalid-regexp
  'no-invalid-regexp': 'error',

  // disallow irregular whitespace outside of strings and comments
  // https://eslint.org/docs/rules/no-irregular-whitespace
  'no-irregular-whitespace': 'error',

  // Disallow Number Literals That Lose Precision
  // https://eslint.org/docs/rules/no-loss-of-precision
  'no-loss-of-precision': 'error',

  // Disallow characters which are made with multiple code points in character class syntax
  // https://eslint.org/docs/rules/no-misleading-character-class
  'no-misleading-character-class': 'error',

  // disallow the use of object properties of the global object (Math and JSON) as functions
  // https://eslint.org/docs/rules/no-obj-calls
  'no-obj-calls': 'error',

  // Disallow new operators with global non-constructor functions
  // https://eslint.org/docs/latest/rules/no-new-native-nonconstructor
  'no-new-native-nonconstructor': 'error',

  // Disallow returning values from Promise executor functions
  // https://eslint.org/docs/rules/no-promise-executor-return
  'no-promise-executor-return': 'error',

  // disallow use of Object.prototypes builtins directly
  // https://eslint.org/docs/rules/no-prototype-builtins
  'no-prototype-builtins': 'error',

  // disallow multiple spaces in a regular expression literal
  // https://eslint.org/docs/rules/no-regex-spaces
  'no-regex-spaces': 'error',

  // Disallow returning values from setters
  // https://eslint.org/docs/rules/no-setter-return
  'no-setter-return': 'error',

  // https://eslint.org/docs/rules/no-sparse-arrays
  'no-sparse-arrays': 'error',

  // https://eslint.org/docs/rules/no-template-curly-in-string
  'no-template-curly-in-string': 'error',

  // Avoid code that looks like two expressions but is actually one
  // https://eslint.org/docs/rules/no-unexpected-multiline
  'no-unexpected-multiline': 'error',

  // disallow unreachable statements after a return, throw, continue, or break statement
  // https://eslint.org/docs/rules/no-unreachable
  'no-unreachable': 'error',

  // Disallow loops with a body that allows only one iteration
  // https://eslint.org/docs/rules/no-unreachable-loop
  'no-unreachable-loop': [
    'error',
    {
      ignore: [], // WhileStatement, DoWhileStatement, ForStatement, ForInStatement, ForOfStatement
    },
  ],

  // https://eslint.org/docs/rules/no-unsafe-finally
  'no-unsafe-finally': 'error',

  // https://eslint.org/docs/rules/no-unsafe-negation
  'no-unsafe-negation': 'error',

  // https://eslint.org/docs/rules/no-unsafe-optional-chaining
  'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: true }],

  // https://eslint.org/docs/rules/no-unused-private-class-members
  'no-unused-private-class-members': 'warn',

  // https://eslint.org/docs/rules/no-useless-backreference
  'no-useless-backreference': 'error',

  // deprecated in favor of no-unsafe-negation
  // https://eslint.org/docs/rules/no-negated-in-lhs
  'no-negated-in-lhs': 'off',

  // Airbnb note: disabled because it is very buggy
  // https://eslint.org/docs/rules/require-atomic-updates
  'require-atomic-updates': 'off',

  // disallow comparisons with the value NaN
  // https://eslint.org/docs/rules/use-isnan
  'use-isnan': 'error',

  // if enable, consider https://github.com/gajus/eslint-plugin-jsdoc
  // https://eslint.org/docs/rules/valid-jsdoc
  'valid-jsdoc': 'off',

  // https://eslint.org/docs/rules/valid-typeof
  'valid-typeof': ['error', { requireStringLiterals: true }],

  // endregion

  // region ES6

  // https://eslint.org/docs/rules/arrow-body-style
  'arrow-body-style': ['warn', 'as-needed', { requireReturnForObjectLiteral: false }],

  // https://eslint.org/docs/rules/arrow-parens
  'arrow-parens': ['warn', 'always'],

  // https://eslint.org/docs/rules/arrow-spacing
  'arrow-spacing': ['warn', { before: true, after: true }],

  // https://eslint.org/docs/rules/constructor-super
  'constructor-super': 'error',

  // https://eslint.org/docs/rules/generator-star-spacing
  'generator-star-spacing': ['warn', { before: false, after: true }],

  // https://eslint.org/docs/rules/no-class-assign
  'no-class-assign': 'error',

  // conflict with prettier
  // https://eslint.org/docs/rules/no-confusing-arrow
  'no-confusing-arrow': ['off', { allowParens: true, onlyOneSimpleParam: true }],

  // https://eslint.org/docs/rules/no-const-assign
  'no-const-assign': 'error',

  // https://eslint.org/docs/rules/no-dupe-class-members
  'no-dupe-class-members': 'error',

  // can be replaced by https://github.com/import-js/eslint-plugin-import/blob/-/docs/rules/no-duplicates.md
  // https://eslint.org/docs/rules/no-duplicate-imports
  'no-duplicate-imports': 'error',

  // disallow symbol constructor
  // https://eslint.org/docs/rules/no-new-symbol
  'no-new-symbol': 'error',

  // disallow to use this/super before super() calling in constructors.
  // https://eslint.org/docs/rules/no-this-before-super
  'no-this-before-super': 'error',

  // disallow useless computed property keys
  // https://eslint.org/docs/rules/no-useless-computed-key
  'no-useless-computed-key': 'warn',

  // disallow unnecessary constructor
  // https://eslint.org/docs/rules/no-useless-constructor
  'no-useless-constructor': 'warn',

  // disallow renaming import, export, and destructured assignments to the same name
  // https://eslint.org/docs/rules/no-useless-rename
  'no-useless-rename': ['warn', { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false }],

  // require let or const instead of var
  // https://eslint.org/docs/rules/no-var
  'no-var': 'error',

  // require method and property shorthand syntax for object literals
  // https://eslint.org/docs/rules/object-shorthand
  'object-shorthand': ['warn', 'always', { ignoreConstructors: false, avoidQuotes: true }],

  // suggest using arrow functions as callbacks
  // https://eslint.org/docs/rules/prefer-arrow-callback
  'prefer-arrow-callback': ['warn', { allowNamedFunctions: false, allowUnboundThis: true }],

  // suggest using of const declaration for variables that are never modified after declared
  // https://eslint.org/docs/rules/prefer-const
  'prefer-const': ['warn', { destructuring: 'any', ignoreReadBeforeAssign: true }],

  // Prefer destructuring from arrays and objects
  // https://eslint.org/docs/rules/prefer-destructuring
  'prefer-destructuring': [
    'warn',
    {
      VariableDeclarator: { array: false, object: true },
      AssignmentExpression: { array: true, object: false },
    },
    { enforceForRenamedProperties: false },
  ],

  // disallow parseInt() in favor of binary, octal, and hexadecimal literals
  // https://eslint.org/docs/rules/prefer-numeric-literals
  'prefer-numeric-literals': 'error',

  // suggest using Reflect methods where applicable
  // https://eslint.org/docs/rules/prefer-reflect
  'prefer-reflect': 'off',

  // use rest parameters instead of arguments
  // https://eslint.org/docs/rules/prefer-rest-params
  'prefer-rest-params': 'error',

  // suggest using the spread syntax instead of .apply()
  // https://eslint.org/docs/rules/prefer-spread
  'prefer-spread': 'error',

  // https://eslint.org/docs/rules/prefer-template
  'prefer-template': 'warn',

  // https://eslint.org/docs/rules/require-yield
  'require-yield': 'error',

  // https://eslint.org/docs/rules/rest-spread-spacing
  'rest-spread-spacing': ['warn', 'never'],

  /* replaced by 'import' plugin if exists */
  // https://eslint.org/docs/rules/sort-imports
  'sort-imports': [
    'warn',
    {
      ignoreCase: false,
      ignoreDeclarationSort: false,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
    },
  ],

  // https://eslint.org/docs/rules/symbol-description
  'symbol-description': 'error',

  // https://eslint.org/docs/rules/template-curly-spacing
  'template-curly-spacing': 'warn',

  // https://eslint.org/docs/rules/yield-star-spacing
  'yield-star-spacing': ['warn', 'after'],

  // endregion

  // region Node

  /* we are using https://github.com/eslint-community/eslint-plugin-n if installed */

  // https://eslint.org/docs/rules/callback-return
  'callback-return': 'off',

  // https://eslint.org/docs/rules/global-require
  'global-require': 'error',

  // https://eslint.org/docs/rules/handle-callback-err
  'handle-callback-err': 'off',

  // https://eslint.org/docs/rules/no-buffer-constructor
  'no-buffer-constructor': 'error',

  // https://eslint.org/docs/rules/no-mixed-requires
  'no-mixed-requires': ['off', false],

  // https://eslint.org/docs/rules/no-new-require
  'no-new-require': 'error',

  // https://eslint.org/docs/rules/no-path-concat
  'no-path-concat': 'error',

  // https://eslint.org/docs/rules/no-process-env
  'no-process-env': 'off',

  // https://eslint.org/docs/rules/no-process-exit
  'no-process-exit': 'off',

  // https://eslint.org/docs/rules/no-restricted-modules
  'no-restricted-modules': 'off',

  // https://eslint.org/docs/rules/no-sync
  'no-sync': 'off',

  // endregion

  // region Strict

  // https://eslint.org/docs/rules/strict
  strict: ['error', 'never'],

  // endregion

  // region Style

  // https://eslint.org/docs/rules/array-bracket-newline
  'array-bracket-newline': ['warn', 'consistent'], // object option alternative: { multiline: true, minItems: 3 }

  // https://eslint.org/docs/rules/array-element-newline
  'array-element-newline': ['off', { multiline: true, minItems: 3 }],

  // https://eslint.org/docs/rules/array-bracket-spacing
  'array-bracket-spacing': ['warn', 'never'],

  // https://eslint.org/docs/rules/block-spacing
  'block-spacing': ['warn', 'always'],

  // https://eslint.org/docs/rules/brace-style
  'brace-style': ['warn', '1tbs', { allowSingleLine: true }],

  // https://eslint.org/docs/rules/camelcase
  camelcase: ['warn', { properties: 'never', ignoreDestructuring: false }],

  // https://eslint.org/docs/rules/capitalized-comments
  'capitalized-comments': [
    'off',
    'never',
    {
      line: { ignorePattern: '.*', ignoreInlineComments: true, ignoreConsecutiveComments: true },
      block: { ignorePattern: '.*', ignoreInlineComments: true, ignoreConsecutiveComments: true },
    },
  ],

  // https://eslint.org/docs/rules/comma-dangle
  'comma-dangle': ['warn', 'always-multiline'],

  // https://eslint.org/docs/rules/comma-spacing
  'comma-spacing': ['warn', { before: false, after: true }],

  // https://eslint.org/docs/rules/comma-style
  'comma-style': [
    'warn',
    'last',
    {
      exceptions: {
        ArrayExpression: false,
        ArrayPattern: false,
        ArrowFunctionExpression: false,
        CallExpression: false,
        FunctionDeclaration: false,
        FunctionExpression: false,
        ImportDeclaration: false,
        ObjectExpression: false,
        ObjectPattern: false,
        VariableDeclaration: false,
        NewExpression: false,
      },
    },
  ],

  // https://eslint.org/docs/rules/computed-property-spacing
  'computed-property-spacing': ['warn', 'never'],

  // https://eslint.org/docs/rules/consistent-this
  'consistent-this': 'off',

  // https://eslint.org/docs/rules/eol-last
  'eol-last': ['warn', 'always'],

  // https://eslint.org/docs/rules/function-call-argument-newline
  'function-call-argument-newline': ['warn', 'consistent'],

  // https://eslint.org/docs/rules/func-call-spacing
  'func-call-spacing': ['warn', 'never'],

  // https://eslint.org/docs/rules/func-name-matching
  'func-name-matching': ['off', 'always', { includeCommonJSModuleExports: false, considerPropertyDescriptor: true }],

  // https://eslint.org/docs/rules/func-names
  'func-names': 'off',

  // https://eslint.org/docs/rules/func-style
  'func-style': ['off', 'expression'],

  // conflict with prettier
  // https://eslint.org/docs/rules/function-paren-newline
  'function-paren-newline': 'off',
  // 'function-paren-newline': ['warn', 'multiline-arguments'],

  // https://eslint.org/docs/rules/id-denylist
  'id-denylist': 'off',

  // https://eslint.org/docs/rules/id-length
  'id-length': 'off',

  // https://eslint.org/docs/rules/id-match
  'id-match': 'off',

  // conflict with prettier
  // https://eslint.org/docs/rules/implicit-arrow-linebreak
  'implicit-arrow-linebreak': 'off',
  // 'implicit-arrow-linebreak': ['warn', 'beside'],

  // conflict with prettier
  // https://eslint.org/docs/rules/indent
  // indent: ['warn', 2],
  indent: [
    'off',
    2,
    {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      // MemberExpression: null,
      FunctionDeclaration: { parameters: 1, body: 1 },
      FunctionExpression: { parameters: 1, body: 1 },
      CallExpression: { arguments: 1 },
      ArrayExpression: 1,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      flatTernaryExpressions: false,
      ignoreComments: false,
      ignoredNodes: [
        'JSXElement',
        'JSXElement > *',
        'JSXAttribute',
        'JSXIdentifier',
        'JSXNamespacedName',
        'JSXMemberExpression',
        'JSXSpreadAttribute',
        'JSXExpressionContainer',
        'JSXOpeningElement',
        'JSXClosingElement',
        'JSXFragment',
        'JSXOpeningFragment',
        'JSXClosingFragment',
        'JSXText',
        'JSXEmptyExpression',
        'JSXSpreadChild',
      ],
    },
  ],

  // https://eslint.org/docs/rules/jsx-quotes
  'jsx-quotes': ['off', 'prefer-double'],

  // https://eslint.org/docs/rules/key-spacing
  'key-spacing': ['warn', { beforeColon: false, afterColon: true }],

  // handle by prettier
  // https://eslint.org/docs/rules/keyword-spacing
  'keyword-spacing': [
    'off',
    {
      before: true,
      after: true,
      overrides: {
        return: { after: true },
        throw: { after: true },
        case: { after: true },
      },
    },
  ],

  // https://eslint.org/docs/rules/line-comment-position
  'line-comment-position': ['off', { position: 'above', ignorePattern: '', applyDefaultPatterns: true }],

  // https://eslint.org/docs/rules/linebreak-style
  'linebreak-style': ['warn', 'unix'],

  // TODO: enable? we have issue to differ DTOs and annotations
  // https://eslint.org/docs/rules/lines-between-class-members
  'lines-between-class-members': 'off',
  // 'lines-between-class-members': [
  //   'warn',
  //   {
  //     enforce: [
  //       { blankLine: 'always', prev: '*', next: '*' },
  //       { blankLine: 'never', prev: 'field', next: 'field' },
  //     ],
  //   },
  // ],
  // 'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: false }],

  // https://eslint.org/docs/rules/lines-around-comment
  'lines-around-comment': 'off',

  // https://eslint.org/docs/rules/lines-around-directive
  'lines-around-directive': ['warn', { before: 'always', after: 'always' }],

  // TODO, semver-major: enable
  // https://eslint.org/docs/latest/rules/logical-assignment-operators
  'logical-assignment-operators': ['off', 'always', { enforceForIfStatements: true }],

  // a.k.a Never Nester
  // https://eslint.org/docs/rules/max-depth
  'max-depth': ['warn', { max: 4 }],

  // https://eslint.org/docs/rules/max-len
  'max-len': [
    'warn',
    {
      // should match prettier
      code: 160,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    },
  ],

  // https://eslint.org/docs/rules/max-lines
  'max-lines': ['off', { max: 300, skipBlankLines: true, skipComments: true }],

  // https://eslint.org/docs/rules/max-lines-per-function
  'max-lines-per-function': ['off', { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true }],

  // https://eslint.org/docs/rules/max-nested-callbacks
  'max-nested-callbacks': 'off',

  // TODO: consider enable later. Ignore constructors?
  // https://eslint.org/docs/rules/max-params
  'max-params': ['off', { max: 4 }],

  // https://eslint.org/docs/rules/max-statements
  'max-statements': ['off', 10],

  // https://eslint.org/docs/rules/max-statements-per-line
  'max-statements-per-line': ['off', { max: 1 }],

  // https://eslint.org/docs/rules/multiline-comment-style
  'multiline-comment-style': ['off', 'starred-block'],

  // TODO: enable?
  // https://eslint.org/docs/rules/multiline-ternary
  'multiline-ternary': ['off', 'never'],

  // https://eslint.org/docs/rules/new-cap
  'new-cap': [
    'error',
    {
      newIsCap: true,
      newIsCapExceptions: [],
      capIsNew: false,
      capIsNewExceptions: ['Immutable.Map', 'Immutable.Set', 'Immutable.List'],
    },
  ],

  // https://eslint.org/docs/rules/new-parens
  'new-parens': 'warn',

  // https://eslint.org/docs/rules/newline-after-var
  'newline-after-var': 'off',

  // https://eslint.org/docs/rules/newline-before-return
  'newline-before-return': 'off',

  // conflict with prettier which based on the line length
  // https://eslint.org/docs/rules/newline-per-chained-call
  'newline-per-chained-call': ['off', { ignoreChainWithDepth: 2 }],

  // https://eslint.org/docs/rules/no-array-constructor
  'no-array-constructor': 'error',

  // https://eslint.org/docs/rules/no-bitwise
  'no-bitwise': 'error',

  // a.k.a Never Nester
  // https://eslint.org/docs/rules/no-continue
  'no-continue': 'off',

  // disallow comments inline after code
  // https://eslint.org/docs/rules/no-inline-comments
  'no-inline-comments': 'off',

  // https://eslint.org/docs/rules/no-lonely-if
  'no-lonely-if': 'warn',

  // https://eslint.org/docs/rules/no-mixed-operators
  'no-mixed-operators': [
    'warn',
    {
      allowSamePrecedence: false,
      // the list of arithmetic groups disallows mixing `%` and `**`
      // with other arithmetic operators.
      groups: [
        ['%', '**'],
        ['%', '+'],
        ['%', '-'],
        ['%', '*'],
        ['%', '/'],
        ['/', '*'],
        ['&', '|', '<<', '>>', '>>>'],
        ['==', '!=', '===', '!=='],
        ['&&', '||'],
      ],
    },
  ],

  // https://eslint.org/docs/rules/no-mixed-spaces-and-tabs
  'no-mixed-spaces-and-tabs': 'warn',

  // https://eslint.org/docs/rules/no-multi-assign
  'no-multi-assign': 'warn',

  // https://eslint.org/docs/rules/no-multiple-empty-lines
  'no-multiple-empty-lines': ['warn', { max: 1, maxBOF: 0, maxEOF: 0 }],

  // https://eslint.org/docs/rules/no-negated-condition
  'no-negated-condition': 'off',

  // disallow nested ternary expressions
  // https://eslint.org/docs/rules/no-nested-ternary
  'no-nested-ternary': 'warn',

  // https://eslint.org/docs/rules/no-new-object
  'no-new-object': 'error',

  // https://eslint.org/docs/rules/no-plusplus
  'no-plusplus': 'off',

  // https://eslint.org/docs/rules/no-spaced-func
  'no-spaced-func': 'off',

  // https://eslint.org/docs/rules/no-tabs
  'no-tabs': 'warn',

  // https://eslint.org/docs/rules/no-ternary
  'no-ternary': 'off',

  // https://eslint.org/docs/rules/no-trailing-spaces
  'no-trailing-spaces': ['warn', { skipBlankLines: false, ignoreComments: false }],

  // https://eslint.org/docs/rules/no-underscore-dangle
  'no-underscore-dangle': ['error', { allow: [], allowAfterThis: false, allowAfterSuper: false, enforceInMethodNames: true }],

  // https://eslint.org/docs/rules/no-unneeded-ternary
  'no-unneeded-ternary': ['warn', { defaultAssignment: false }],

  // https://eslint.org/docs/rules/no-whitespace-before-property
  'no-whitespace-before-property': 'warn',

  // https://eslint.org/docs/rules/nonblock-statement-body-position
  'nonblock-statement-body-position': ['warn', 'beside', { overrides: {} }],

  // https://eslint.org/docs/rules/object-curly-spacing
  'object-curly-spacing': ['warn', 'always'],

  // note: let prettier do that based on the line width
  // it also not handle comments well
  // https://eslint.org/docs/rules/object-curly-newline
  'object-curly-newline': 'off',
  // 'object-curly-newline': [
  //   'warn',
  //   {
  //     ObjectExpression: { multiline: true },
  //     ObjectPattern: { multiline: true },
  //     ImportDeclaration: { multiline: true },
  //     ExportDeclaration: { multiline: true },
  //     // note, we also set before (prettier conflict): { minProperties: 7, multiline: true, consistent: true }
  //   },
  // ],

  // https://eslint.org/docs/rules/object-property-newline
  'object-property-newline': ['warn', { allowAllPropertiesOnSameLine: true }],

  // https://eslint.org/docs/rules/one-var
  'one-var': ['off', 'never'],

  // https://eslint.org/docs/rules/one-var-declaration-per-line
  'one-var-declaration-per-line': ['off', 'always'],

  // https://eslint.org/docs/rules/operator-assignment
  'operator-assignment': ['warn', 'always'],

  // disabled to avoid conflicts with prettier
  // https://eslint.org/docs/rules/operator-linebreak
  'operator-linebreak': ['off', 'before', { overrides: { '=': 'none' } }],

  // https://eslint.org/docs/rules/padded-blocks
  'padded-blocks': ['warn', { blocks: 'never', classes: 'never', switches: 'never' }, { allowSingleLineBlocks: true }],

  // https://eslint.org/docs/rules/padding-line-between-statements
  'padding-line-between-statements': 'off',

  // Off by ZI for readability
  // https://eslint.org/docs/rules/prefer-exponentiation-operator
  'prefer-exponentiation-operator': 'off',

  // https://eslint.org/docs/rules/prefer-object-spread
  'prefer-object-spread': 'warn',

  // https://eslint.org/docs/rules/quote-props
  'quote-props': ['warn', 'as-needed', { keywords: false, unnecessary: true, numbers: false }],

  // https://eslint.org/docs/rules/quotes
  quotes: ['warn', 'single', { avoidEscape: true }],

  // https://eslint.org/docs/rules/require-jsdoc
  'require-jsdoc': 'off',

  // https://eslint.org/docs/rules/semi
  semi: ['warn', 'always'],

  // https://eslint.org/docs/rules/semi-spacing
  'semi-spacing': ['warn', { before: false, after: true }],

  // https://eslint.org/docs/rules/semi-style
  'semi-style': ['warn', 'last'],

  // https://eslint.org/docs/rules/sort-keys
  'sort-keys': ['off', 'asc', { caseSensitive: false, natural: true }],

  // https://eslint.org/docs/rules/sort-vars
  'sort-vars': 'off',

  // https://eslint.org/docs/rules/space-before-blocks
  'space-before-blocks': 'warn',

  // https://eslint.org/docs/rules/space-before-function-paren
  'space-before-function-paren': ['warn', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],

  // require or disallow spaces inside parentheses
  // https://eslint.org/docs/rules/space-in-parens
  'space-in-parens': ['warn', 'never'],

  // https://eslint.org/docs/rules/space-infix-ops
  'space-infix-ops': 'warn',

  // https://eslint.org/docs/rules/space-unary-ops
  'space-unary-ops': ['warn', { words: true, nonwords: false, overrides: {} }],

  // https://eslint.org/docs/rules/spaced-comment
  'spaced-comment': [
    'warn',
    'always',
    {
      line: {
        exceptions: ['-', '+'],
        markers: ['=', '!', '/'], // space here to support sprockets directives, slash for TS /// comments
      },
      block: {
        exceptions: ['-', '+'],
        markers: ['=', '!', ':', '::'], // space here to support sprockets directives and flow comment types
        balanced: true,
      },
    },
  ],

  // https://eslint.org/docs/rules/switch-colon-spacing
  'switch-colon-spacing': ['warn', { after: true, before: false }],

  // https://eslint.org/docs/rules/template-tag-spacing
  'template-tag-spacing': ['warn', 'never'],

  // https://eslint.org/docs/rules/unicode-bom
  'unicode-bom': ['error', 'never'],

  // https://eslint.org/docs/rules/wrap-regex
  'wrap-regex': 'off',

  // endregion

  // region Variables

  // https://eslint.org/docs/rules/init-declarations
  'init-declarations': 'off',

  // https://eslint.org/docs/rules/no-catch-shadow
  'no-catch-shadow': 'off',

  // https://eslint.org/docs/rules/no-delete-var
  'no-delete-var': 'error',

  // https://eslint.org/docs/rules/no-label-var
  'no-label-var': 'error',

  // https://eslint.org/docs/rules/no-shadow
  'no-shadow': 'error',

  // https://eslint.org/docs/rules/no-shadow-restricted-names
  'no-shadow-restricted-names': 'error',

  // https://eslint.org/docs/rules/no-undef
  'no-undef': 'error',

  // https://eslint.org/docs/rules/no-undef-init
  'no-undef-init': 'warn',

  // https://eslint.org/docs/rules/no-undefined
  'no-undefined': 'off',

  // https://eslint.org/docs/rules/no-unused-vars
  'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: true }],

  // https://eslint.org/docs/rules/no-use-before-define
  'no-use-before-define': ['error', { functions: true, classes: true, variables: true }],

  // endregion
};

const base = {
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      generators: true,
      objectLiteralDuplicateProperties: false,
    },
  },
  rules: {
    ...builtinRules,
  },
};

module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', '@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'no-console': 'warn',
    'prettier/prettier': [
      'warn',
      {
        printWidth: 150, // Customize the print width (default 80)
        tabWidth: 2, // Customize tab width
        semi: true, // Add or remove semicolons
        singleQuote: true, // Use single quotes or double quotes
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.cts', '*.mts'],
      env: { es6: true, node: true, browser: true },
      ...base,
    },
    {
      files: ['*.{spec,test}.{cts,mts,ts,cjs,mjs,jsx,tsx}'],
      env: { jest: true },
      rules: {
        'no-extend-native': 'off',
        'global-require': 'off',
      },
    },
  ],
};
