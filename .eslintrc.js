module.exports = {
    'env': {
        'browser': false,
        'commonjs': true,
        'es2021': true,
        'node': true,
        'mocha': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 12
    },
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        'no-unused-vars': [
            'warn',
            { 'argsIgnorePattern': '^_', 'varsIgnorePattern': 'should' }
        ]
    }
};
