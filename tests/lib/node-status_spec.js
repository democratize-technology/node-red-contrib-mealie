/**
 * Test suite for Node Status Utilities
 */

const should = require('should');
const sinon = require('sinon');
const { setNodeStatus, setSuccessStatus, setErrorStatus, clearStatus } = require('../../lib/node-status');

describe('Node Status Utilities', () => {
    let mockNode, clock;

    beforeEach(() => {
        // Create a mock node with status method
        mockNode = {
            status: sinon.stub()
        };

        // Use fake timers to control setTimeout
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
    });

    describe('setNodeStatus', () => {
        it('should set green status for success', () => {
            setNodeStatus(mockNode, true, 'test message');

            mockNode.status.calledOnce.should.be.true();
            mockNode.status.calledWith({
                fill: 'green',
                shape: 'dot',
                text: 'test message'
            }).should.be.true();
        });

        it('should set red status for error', () => {
            setNodeStatus(mockNode, false, 'error message');

            mockNode.status.calledOnce.should.be.true();
            mockNode.status.calledWith({
                fill: 'red',
                shape: 'dot',
                text: 'error message'
            }).should.be.true();
        });

        it('should clear status after default timeout (5000ms)', () => {
            setNodeStatus(mockNode, true, 'test message');

            // Initial status call
            mockNode.status.calledOnce.should.be.true();

            // Fast-forward time by 5000ms
            clock.tick(5000);

            // Should clear status
            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });

        it('should clear status after custom timeout', () => {
            setNodeStatus(mockNode, true, 'test message', 3000);

            // Initial status call
            mockNode.status.calledOnce.should.be.true();

            // Fast-forward time by 3000ms
            clock.tick(3000);

            // Should clear status
            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });

        it('should not clear status before timeout', () => {
            setNodeStatus(mockNode, true, 'test message');

            // Initial status call
            mockNode.status.calledOnce.should.be.true();

            // Fast-forward time by 4999ms (just before timeout)
            clock.tick(4999);

            // Should not clear status yet
            mockNode.status.calledOnce.should.be.true();
        });
    });

    describe('setSuccessStatus', () => {
        it('should set green status with operation success message', () => {
            setSuccessStatus(mockNode, 'create');

            mockNode.status.calledOnce.should.be.true();
            mockNode.status.calledWith({
                fill: 'green',
                shape: 'dot',
                text: 'create success'
            }).should.be.true();
        });

        it('should clear status after timeout', () => {
            setSuccessStatus(mockNode, 'update');

            clock.tick(5000);

            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });

        it('should use custom timeout', () => {
            setSuccessStatus(mockNode, 'delete', 2000);

            clock.tick(2000);

            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });
    });

    describe('setErrorStatus', () => {
        it('should set red status with error message', () => {
            setErrorStatus(mockNode, 'Something went wrong');

            mockNode.status.calledOnce.should.be.true();
            mockNode.status.calledWith({
                fill: 'red',
                shape: 'dot',
                text: 'Something went wrong'
            }).should.be.true();
        });

        it('should clear status after timeout', () => {
            setErrorStatus(mockNode, 'Error occurred');

            clock.tick(5000);

            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });

        it('should use custom timeout', () => {
            setErrorStatus(mockNode, 'Connection failed', 1500);

            clock.tick(1500);

            mockNode.status.calledTwice.should.be.true();
            mockNode.status.secondCall.calledWith({}).should.be.true();
        });
    });

    describe('clearStatus', () => {
        it('should clear node status immediately', () => {
            clearStatus(mockNode);

            mockNode.status.calledOnce.should.be.true();
            mockNode.status.calledWith({}).should.be.true();
        });
    });
});