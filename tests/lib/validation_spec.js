/**
 * Tests for validation utilities
 */

const { expect } = require('chai');
const {
    safeJsonParse,
    validateObjectStructure,
    validateString,
    validateSlug,
    validateId,
    validateOperation,
    validateRecipeData,
    processInputData
} = require('../../lib/validation');
const { ValidationError } = require('../../lib/errors');

describe('Validation Utilities', function() {
    describe('safeJsonParse', function() {
        it('should parse valid JSON', function() {
            const result = safeJsonParse('{"name": "test"}');
            expect(result).to.deep.equal({ name: 'test' });
        });

        it('should throw ValidationError for invalid JSON', function() {
            expect(() => safeJsonParse('{"invalid": }')).to.throw(ValidationError, 'Invalid JSON format');
        });

        it('should throw ValidationError for non-string input', function() {
            expect(() => safeJsonParse(123)).to.throw(ValidationError, 'Input must be a string');
        });

        it('should throw ValidationError for oversized JSON', function() {
            const largeString = '{"data": "' + 'x'.repeat(10000) + '"}';
            expect(() => safeJsonParse(largeString, 100)).to.throw(ValidationError, 'exceeds maximum size');
        });

        it('should reject prototype pollution attempts', function() {
            expect(() => safeJsonParse('{"__proto__": {"polluted": true}}')).to.throw(ValidationError, 'Dangerous key detected');
        });
    });

    describe('validateObjectStructure', function() {
        it('should validate normal objects', function() {
            expect(() => validateObjectStructure({ name: 'test', id: 1 })).to.not.throw();
        });

        it('should reject deeply nested objects', function() {
            const deepObject = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 'deep' } } } } } } } } } } };
            expect(() => validateObjectStructure(deepObject)).to.throw(ValidationError, 'exceeds maximum depth');
        });

        it('should reject objects with too many keys', function() {
            const largeObject = {};
            for (let i = 0; i < 150; i++) {
                largeObject[`key${i}`] = `value${i}`;
            }
            expect(() => validateObjectStructure(largeObject)).to.throw(ValidationError, 'too many keys');
        });

        it('should reject large arrays', function() {
            const largeArray = new Array(1500).fill('item');
            expect(() => validateObjectStructure(largeArray)).to.throw(ValidationError, 'Array length exceeds');
        });

        it('should handle null and primitive values', function() {
            expect(() => validateObjectStructure(null)).to.not.throw();
            expect(() => validateObjectStructure('string')).to.not.throw();
            expect(() => validateObjectStructure(123)).to.not.throw();
        });
    });

    describe('validateString', function() {
        it('should validate normal strings', function() {
            const result = validateString('test string');
            expect(result).to.equal('test string');
        });

        it('should trim strings by default', function() {
            const result = validateString('  trimmed  ');
            expect(result).to.equal('trimmed');
        });

        it('should handle required validation', function() {
            expect(() => validateString(null, { required: true })).to.throw(ValidationError, 'Required string value is missing');
            expect(() => validateString('', { required: true, minLength: 1 })).to.throw(ValidationError, 'at least 1 characters');
        });

        it('should enforce length limits', function() {
            expect(() => validateString('x'.repeat(200), { maxLength: 100 })).to.throw(ValidationError, 'exceeds maximum');
            expect(() => validateString('hi', { minLength: 5 })).to.throw(ValidationError, 'at least 5 characters');
        });

        it('should validate patterns', function() {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            expect(() => validateString('invalid-email', { pattern: emailPattern })).to.throw(ValidationError, 'does not match required pattern');
            expect(validateString('test@example.com', { pattern: emailPattern })).to.equal('test@example.com');
        });

        it('should convert non-strings', function() {
            expect(validateString(123)).to.equal('123');
            expect(validateString(true)).to.equal('true');
        });
    });

    describe('validateSlug', function() {
        it('should validate proper slugs', function() {
            expect(validateSlug('valid-slug')).to.equal('valid-slug');
            expect(validateSlug('recipe-123')).to.equal('recipe-123');
            expect(validateSlug('simple')).to.equal('simple');
        });

        it('should reject invalid slug formats', function() {
            expect(() => validateSlug('Invalid Slug')).to.throw(ValidationError, 'does not match required pattern');
            expect(() => validateSlug('slug_with_underscore')).to.throw(ValidationError, 'does not match required pattern');
            expect(() => validateSlug('slug.with.dots')).to.throw(ValidationError, 'does not match required pattern');
            expect(() => validateSlug('-starts-with-dash')).to.throw(ValidationError, 'does not match required pattern');
            expect(() => validateSlug('ends-with-dash-')).to.throw(ValidationError, 'does not match required pattern');
        });

        it('should handle required validation', function() {
            expect(() => validateSlug(null, true)).to.throw(ValidationError, 'No slug provided');
            expect(validateSlug(null, false)).to.equal('');
        });

        it('should enforce length limits', function() {
            const longSlug = 'a'.repeat(101);
            expect(() => validateSlug(longSlug)).to.throw(ValidationError, 'exceeds maximum');
        });
    });

    describe('validateId', function() {
        it('should validate numeric IDs', function() {
            expect(validateId(123)).to.equal(123);
            expect(validateId(0)).to.equal(0);
        });

        it('should validate string IDs', function() {
            expect(validateId('abc-123')).to.equal('abc-123');
            expect(validateId('uuid-like-string')).to.equal('uuid-like-string');
        });

        it('should convert numeric strings', function() {
            expect(validateId('123')).to.equal(123);
            expect(validateId('  456  ')).to.equal(456);
        });

        it('should reject invalid numeric IDs', function() {
            expect(() => validateId(-1)).to.throw(ValidationError, 'non-negative integer');
            expect(() => validateId(1.5)).to.throw(ValidationError, 'non-negative integer');
        });

        it('should handle required validation', function() {
            expect(() => validateId(null, true)).to.throw(ValidationError, 'No ID provided');
            expect(validateId(null, false)).to.be.null;
        });

        it('should reject oversized string IDs', function() {
            const longId = 'x'.repeat(101);
            expect(() => validateId(longId)).to.throw(ValidationError, 'exceeds maximum');
        });

        it('should reject invalid types', function() {
            expect(() => validateId({})).to.throw(ValidationError, 'ID must be a number or string');
            expect(() => validateId([])).to.throw(ValidationError, 'ID must be a number or string');
        });
    });

    describe('validateOperation', function() {
        it('should validate allowed operations', function() {
            const allowed = ['get', 'create', 'update', 'delete'];
            expect(validateOperation('get', allowed)).to.equal('get');
            expect(validateOperation('  create  ', allowed)).to.equal('create');
        });

        it('should reject disallowed operations', function() {
            const allowed = ['get', 'create'];
            expect(() => validateOperation('delete', allowed)).to.throw(ValidationError, 'Unsupported operation: delete. Allowed: get, create');
        });

        it('should require operation to be specified', function() {
            expect(() => validateOperation('', ['get'])).to.throw(ValidationError);
            expect(() => validateOperation(null, ['get'])).to.throw(ValidationError);
        });
    });

    describe('validateRecipeData', function() {
        it('should validate proper recipe data', function() {
            const recipeData = {
                name: 'Test Recipe',
                description: 'A test recipe',
                prepTime: 15,
                cookTime: 30,
                recipeIngredient: ['ingredient 1', 'ingredient 2'],
                tags: ['dinner', 'easy']
            };

            const result = validateRecipeData(recipeData);
            expect(result.name).to.equal('Test Recipe');
            expect(result.description).to.equal('A test recipe');
            expect(result.prepTime).to.equal(15);
        });

        it('should require name field', function() {
            const recipeData = { description: 'No name recipe' };
            const result = validateRecipeData(recipeData);
            expect(result.description).to.equal('No name recipe');
            expect(result.name).to.be.undefined;
        });

        it('should validate string field lengths', function() {
            const recipeData = {
                name: 'x'.repeat(300)
            };
            expect(() => validateRecipeData(recipeData)).to.throw(ValidationError, 'exceeds maximum');
        });

        it('should validate numeric fields', function() {
            const recipeData = {
                name: 'Test',
                prepTime: -5
            };
            expect(() => validateRecipeData(recipeData)).to.throw(ValidationError, 'non-negative number');
        });

        it('should validate array fields', function() {
            const recipeData = {
                name: 'Test',
                tags: 'not-an-array'
            };
            expect(() => validateRecipeData(recipeData)).to.throw(ValidationError, 'must be an array');
        });

        it('should reject invalid recipe data types', function() {
            expect(() => validateRecipeData('string')).to.throw(ValidationError, 'must be a valid object');
            expect(() => validateRecipeData(null)).to.throw(ValidationError, 'must be a valid object');
        });
    });

    describe('processInputData', function() {
        it('should process JSON strings', function() {
            const jsonString = '{"name": "Test Recipe", "description": "Test"}';
            const result = processInputData(jsonString, 'recipe');
            expect(result.name).to.equal('Test Recipe');
        });

        it('should process objects directly', function() {
            const recipeData = { name: 'Test Recipe', description: 'Test' };
            const result = processInputData(recipeData, 'recipe');
            expect(result.name).to.equal('Test Recipe');
        });

        it('should reject invalid data types', function() {
            expect(() => processInputData(123, 'recipe')).to.throw(ValidationError, 'must be an object or JSON string');
            expect(() => processInputData(null, 'recipe')).to.throw(ValidationError, 'No recipe data provided');
        });

        it('should handle generic type validation', function() {
            const data = { test: 'data' };
            const result = processInputData(data, 'generic');
            expect(result.test).to.equal('data');
        });

        it('should validate malformed JSON strings', function() {
            expect(() => processInputData('{"invalid": }', 'recipe')).to.throw(ValidationError, 'Invalid JSON format');
        });
    });
});