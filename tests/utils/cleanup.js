// Test cleanup utility
module.exports = {
    cleanup: () => {
        // Clear any timers
        clearInterval();
        clearTimeout();
        
        // Remove process listeners
        process.removeAllListeners('unhandledRejection');
        process.removeAllListeners('uncaughtException');
        
        // Reset environment variables
        delete process.env.NODE_ENV;
    }
};
