/**
 * Centralized shutdown manager for coordinating cleanup across modules
 * Prevents duplicate process exit handlers and ensures orderly cleanup
 */

class ShutdownManager {
    constructor() {
        this.handlers = new Set();
        this.isShuttingDown = false;
        this.registered = false;
    }

    /**
     * Register a cleanup handler
     * @param {Function} handler - Cleanup function to call on shutdown
     * @param {string} [name] - Optional name for debugging
     */
    register(handler, name = 'anonymous') {
        if (typeof handler !== 'function') {
            throw new TypeError('Shutdown handler must be a function');
        }

        this.handlers.add({ handler, name });
        
        // Register process handlers only once
        if (!this.registered) {
            this.setupProcessHandlers();
            this.registered = true;
        }
    }

    /**
     * Unregister a cleanup handler
     * @param {Function} handler - Handler to remove
     */
    unregister(handler) {
        for (const item of this.handlers) {
            if (item.handler === handler) {
                this.handlers.delete(item);
                break;
            }
        }
    }

    /**
     * Execute all cleanup handlers
     * @param {string} [_reason] - Reason for shutdown
     */
    async cleanup(_reason = 'shutdown') {
        if (this.isShuttingDown) {
            return;
        }
        
        this.isShuttingDown = true;
        
        const promises = [];
        for (const { handler, name } of this.handlers) {
            try {
                const result = handler();
                if (result && typeof result.then === 'function') {
                    promises.push(result);
                }
            } catch (error) {
                console.error(`Shutdown handler '${name}' failed:`, error);
            }
        }

        // Wait for all async handlers with timeout
        if (promises.length > 0) {
            try {
                await Promise.race([
                    Promise.all(promises),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
                    )
                ]);
            } catch (error) {
                console.error('Some cleanup handlers failed or timed out:', error.message);
            }
        }
    }

    /**
     * Setup process event handlers
     */
    setupProcessHandlers() {
        // Graceful shutdown on SIGTERM
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM, starting graceful shutdown...');
            await this.cleanup('SIGTERM');
            process.exit(0);
        });

        // Graceful shutdown on SIGINT (Ctrl+C)
        process.on('SIGINT', async () => {
            console.log('Received SIGINT, starting graceful shutdown...');
            await this.cleanup('SIGINT');
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception:', error);
            await this.cleanup('uncaughtException');
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, _promise) => {
            console.error('Unhandled promise rejection:', reason);
            await this.cleanup('unhandledRejection');
            process.exit(1);
        });
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isShuttingDown: this.isShuttingDown,
            registeredHandlers: this.handlers.size,
            registered: this.registered
        };
    }
}

// Export singleton instance
const shutdownManager = new ShutdownManager();
module.exports = shutdownManager;