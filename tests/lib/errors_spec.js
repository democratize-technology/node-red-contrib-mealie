const should = require('should');
const sinon = require('sinon');
const errors = require('../../lib/errors');

describe('Error Utilities', function() {

    describe('MealieError', function() {
        it('should create a basic error with code and details', function() {
            const error = new errors.MealieError('Test error', 'TEST_CODE', { test: true });
            error.should.be.instanceof(Error);
            error.should.have.property('name', 'MealieError');
            error.should.have.property('message', 'Test error');
            error.should.have.property('code', 'TEST_CODE');
            error.should.have.property('details');
            error.details.should.have.property('test', true);
        });

        it('should default to UNKNOWN_ERROR if no code provided', function() {
            const error = new errors.MealieError('Test error');
            error.should.have.property('code', 'UNKNOWN_ERROR');
        });
    });

    describe('NetworkError', function() {
        it('should create a network error', function() {
            const error = new errors.NetworkError('Network failed');
            error.should.be.instanceof(errors.MealieError);
            error.should.have.property('name', 'NetworkError');
            error.should.have.property('code', 'NETWORK_ERROR');
        });
    });

    describe('AuthenticationError', function() {
        it('should create an authentication error', function() {
            const error = new errors.AuthenticationError('Auth failed');
            error.should.be.instanceof(errors.MealieError);
            error.should.have.property('name', 'AuthenticationError');
            error.should.have.property('code', 'AUTH_ERROR');
        });
    });

    describe('ValidationError', function() {
        it('should create a validation error', function() {
            const error = new errors.ValidationError('Invalid data');
            error.should.be.instanceof(errors.MealieError);
            error.should.have.property('name', 'ValidationError');
            error.should.have.property('code', 'VALIDATION_ERROR');
        });
    });

    describe('ConfigurationError', function() {
        it('should create a configuration error', function() {
            const error = new errors.ConfigurationError('Config invalid');
            error.should.be.instanceof(errors.MealieError);
            error.should.have.property('name', 'ConfigurationError');
            error.should.have.property('code', 'CONFIG_ERROR');
        });
    });

    describe('RateLimitError', function() {
        it('should create a rate limit error', function() {
            const error = new errors.RateLimitError('Rate limit exceeded');
            error.should.be.instanceof(errors.MealieError);
            error.should.have.property('name', 'RateLimitError');
            error.should.have.property('code', 'RATE_LIMIT_ERROR');
        });
    });

    describe('transformError', function() {
        it('should transform FetchError to NetworkError', function() {
            const fetchError = new Error('Connection failed');
            fetchError.name = 'FetchError';

            const transformed = errors.transformError(fetchError);
            transformed.should.be.instanceof(errors.NetworkError);
            transformed.message.should.equal('Connection failed: Connection failed');
        });

        it('should transform ECONNREFUSED to NetworkError', function() {
            const connError = new Error('Connection refused');
            connError.code = 'ECONNREFUSED';

            const transformed = errors.transformError(connError);
            transformed.should.be.instanceof(errors.NetworkError);
            transformed.message.should.equal('Connection failed: Connection refused');
        });

        it('should transform ETIMEDOUT to NetworkError', function() {
            const timeoutError = new Error('Connection timeout');
            timeoutError.code = 'ETIMEDOUT';

            const transformed = errors.transformError(timeoutError);
            transformed.should.be.instanceof(errors.NetworkError);
            transformed.message.should.equal('Connection failed: Connection timeout');
        });

        it('should transform 429 status to RateLimitError', function() {
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.statusCode = 429;

            const transformed = errors.transformError(rateLimitError);
            transformed.should.be.instanceof(errors.RateLimitError);
            transformed.message.should.equal('Rate limit exceeded');
        });

        it('should transform 401 status to AuthenticationError', function() {
            const authError = new Error('Unauthorized');
            authError.statusCode = 401;

            const transformed = errors.transformError(authError);
            transformed.should.be.instanceof(errors.AuthenticationError);
            transformed.message.should.equal('Authentication failed');
        });

        it('should transform 403 status to AuthenticationError', function() {
            const authError = new Error('Forbidden');
            authError.statusCode = 403;

            const transformed = errors.transformError(authError);
            transformed.should.be.instanceof(errors.AuthenticationError);
            transformed.message.should.equal('Authentication failed');
        });

        it('should transform 400 status to ValidationError', function() {
            const validationError = new Error('Bad Request');
            validationError.statusCode = 400;

            const transformed = errors.transformError(validationError);
            transformed.should.be.instanceof(errors.ValidationError);
            transformed.message.should.equal('Invalid request data');
        });

        it('should return MealieError instances unchanged', function() {
            const mealieError = new errors.MealieError('Test', 'SPECIFIC_CODE');

            const transformed = errors.transformError(mealieError);
            transformed.should.equal(mealieError);
        });

        it('should not transform already MealieError subclass instances', function() {
            const networkError = new errors.NetworkError('Already a NetworkError');

            const transformed = errors.transformError(networkError);
            transformed.should.equal(networkError);
            transformed.should.be.instanceof(errors.NetworkError);
        });

        it('should wrap unknown errors as MealieError', function() {
            const unknownError = new Error('Unknown error');

            const transformed = errors.transformError(unknownError);
            transformed.should.be.instanceof(errors.MealieError);
            transformed.should.have.property('code', 'UNKNOWN_ERROR');
            transformed.message.should.equal('Unknown error');
        });

        it('should preserve statusCode for unknown errors', function() {
            const unknownError = new Error('Server error');
            unknownError.statusCode = 500;

            const transformed = errors.transformError(unknownError);
            transformed.should.be.instanceof(errors.MealieError);
            transformed.should.have.property('statusCode', 500);
        });
    });

    describe('handleError', function() {
        let mockNode;
        let msg;

        beforeEach(function() {
            mockNode = {
                error: sinon.stub(),
                send: sinon.stub(),
                log: sinon.stub()
            };
            msg = {};
        });

        it('should handle errors consistently', function() {
            const error = new errors.MealieError('Test error', 'TEST_CODE');
            errors.handleError(error, mockNode, msg);

            // Should log the error
            mockNode.error.calledOnce.should.be.true();
            mockNode.error.firstCall.args[0].should.equal('Mealie Error: Test error');

            // Should attach error to message
            msg.should.have.property('payload');
            msg.payload.should.have.property('success', false);
            msg.payload.should.have.property('error');
            msg.payload.error.should.have.property('message', 'Test error');
            msg.payload.error.should.have.property('code', 'TEST_CODE');

            // Should send to error output
            mockNode.send.calledOnce.should.be.true();
            const outputs = mockNode.send.firstCall.args[0];
            outputs[1].should.equal(msg);
        });
    });

    describe('withErrorHandling', function() {
        let mockNode;

        beforeEach(function() {
            mockNode = {
                error: sinon.stub(),
                send: sinon.stub(),
                log: sinon.stub()
            };
        });

        it('should execute operation successfully', async function() {
            const operation = sinon.stub().resolves('success');
            const result = await errors.withErrorHandling(operation, mockNode);
            result.should.equal('success');
        });

        it('should transform FetchError to NetworkError', async function() {
            const fetchError = new Error('Connection failed');
            fetchError.name = 'FetchError';

            const operation = sinon.stub().rejects(fetchError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.NetworkError);
            }
        });

        it('should transform ECONNREFUSED to NetworkError', async function() {
            const connError = new Error('Connection refused');
            connError.code = 'ECONNREFUSED';

            const operation = sinon.stub().rejects(connError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.NetworkError);
            }
        });

        it('should transform ETIMEDOUT to NetworkError', async function() {
            const timeoutError = new Error('Connection timeout');
            timeoutError.code = 'ETIMEDOUT';

            const operation = sinon.stub().rejects(timeoutError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.NetworkError);
            }
        });

        it('should transform 429 status to RateLimitError', async function() {
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.statusCode = 429;

            const operation = sinon.stub().rejects(rateLimitError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.RateLimitError);
            }
        });

        it('should transform 401 status to AuthenticationError', async function() {
            const authError = new Error('Unauthorized');
            authError.statusCode = 401;

            const operation = sinon.stub().rejects(authError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.AuthenticationError);
            }
        });

        it('should transform 403 status to AuthenticationError', async function() {
            const authError = new Error('Forbidden');
            authError.statusCode = 403;

            const operation = sinon.stub().rejects(authError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.AuthenticationError);
            }
        });

        it('should transform 400 status to ValidationError', async function() {
            const validationError = new Error('Bad Request');
            validationError.statusCode = 400;

            const operation = sinon.stub().rejects(validationError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.ValidationError);
            }
        });

        it('should wrap unknown errors as MealieError', async function() {
            const unknownError = new Error('Unknown error');

            const operation = sinon.stub().rejects(unknownError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(errors.MealieError);
                error.should.have.property('code', 'UNKNOWN_ERROR');
            }
        });

        it('should not rewrap existing MealieError', async function() {
            const mealieError = new errors.MealieError('Test', 'SPECIFIC_CODE');

            const operation = sinon.stub().rejects(mealieError);

            try {
                await errors.withErrorHandling(operation, mockNode);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.equal(mealieError);
            }
        });

        it('should skip retries when MEALIE_RETRY_ENABLED=false', async function() {
            // Temporarily disable retries
            const originalEnv = process.env.MEALIE_RETRY_ENABLED;
            process.env.MEALIE_RETRY_ENABLED = 'false';

            try {
                // Reload the errors module to pick up new env variable
                delete require.cache[require.resolve('../../lib/errors')];
                const errorsWithRetryDisabled = require('../../lib/errors');

                const networkError = new Error('Connection failed');
                networkError.code = 'ECONNREFUSED';

                const operation = sinon.stub().rejects(networkError);

                try {
                    await errorsWithRetryDisabled.withErrorHandling(operation, mockNode);
                    should.fail('Should have thrown');
                } catch (error) {
                    error.should.be.instanceof(errorsWithRetryDisabled.NetworkError);
                    operation.calledOnce.should.be.true(); // No retries
                    mockNode.log.called.should.be.false(); // No retry logs
                }
            } finally {
                // Restore original env and reload module
                if (originalEnv === undefined) {
                    delete process.env.MEALIE_RETRY_ENABLED;
                } else {
                    process.env.MEALIE_RETRY_ENABLED = originalEnv;
                }
                delete require.cache[require.resolve('../../lib/errors')];
                require('../../lib/errors');
            }
        });
    });
});
