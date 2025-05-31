require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The utility node requires these modules
const rewiredUtilityNode = proxyquire('../../../nodes/utility/mealie-utility', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-utility Node with getVersion operation', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        sinon.restore();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility GetVersion',
                server: 'server1',
                operation: 'getVersion',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Utility GetVersion');
                n1.should.have.property('operation', 'getVersion');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve API version', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                operation: 'getVersion',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Set up mock for utilities operation
        mockClient.utilities = {
            getVersion: sinon.stub().resolves({
                version: '1.0.0-beta.5',
                buildId: '20230515.1',
                apiVersion: 'v1',
                demoStatus: false,
                productionStatus: true
            })
        };

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getVersion');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('version', '1.0.0-beta.5');
                    msg.payload.data.should.have.property('buildId', '20230515.1');
                    msg.payload.data.should.have.property('apiVersion', 'v1');
                    msg.payload.data.should.have.property('demoStatus', false);
                    msg.payload.data.should.have.property('productionStatus', true);

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.utilities.getVersion);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve API version when operation is specified in msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                // No operation set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub and define return value
        mockClient.utilities.getVersion = sinon.stub().resolves({
            version: '1.0.0-beta.6',
            buildId: '20230520.1',
            apiVersion: 'v1',
            demoStatus: false,
            productionStatus: true
        });

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getVersion');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('version', '1.0.0-beta.6');
                    msg.payload.data.should.have.property('buildId', '20230520.1');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.utilities.getVersion);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation in the payload
            n1.receive({ payload: { operation: 'getVersion' } });
        });
    });

    it('should handle errors gracefully', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                operation: 'getVersion',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getVersion stub throw an error
        mockClient.utilities.getVersion = sinon.stub().rejects(new Error('Failed to fetch version'));

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getVersion');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Failed to fetch version');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });
});
