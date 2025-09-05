/**
 * Mealie Server Configuration Node
 * Stores credentials and connection details for Mealie instance
 */

module.exports = function (RED) {
    function MealieServerConfigNode(config) {
        RED.nodes.createNode(this, config);

        // Store configuration
        this.name = config.name;
        this.url = config.url;
        this.timeout = config.timeout || 5000;

        // Credentials are stored securely by Node-RED framework
        if (this.credentials) {
            this.apiToken = this.credentials.apiToken;
        }

        // Method to get authenticated Mealie client
        this.getMealieClient = async function () {
            if (!this.url || !this.apiToken) {
                throw new Error('Missing Mealie server URL or API token');
            }

            // Use dynamic import for ES module
            try {
                // Allow overriding for testing
                const dynamicImport = this.dynamicImport || (async (path) => await import(path));
                const mealieModule = await dynamicImport('node-mealie');
                const {
                    MealieClient,
                    RecipeService,
                    HouseholdsService,
                    AboutService,
                    GroupsService,
                    OrganizerService,
                    UserService,
                    MediaService,
                    AdminService
                } = mealieModule;

                // Create client with token included in constructor options
                const baseClient = new MealieClient({
                    baseUrl: this.url,
                    timeout: this.timeout,
                    token: this.apiToken, // Pass token directly in constructor
                });

                // Initialize services and create client with all services (immutable pattern)
                const clientWithServices = Object.assign(Object.create(Object.getPrototypeOf(baseClient)), {
                    ...baseClient,
                    recipes: new RecipeService(baseClient),
                    households: new HouseholdsService(baseClient),
                    about: new AboutService(baseClient),
                    groups: new GroupsService(baseClient),
                    organizers: new OrganizerService(baseClient),
                    users: new UserService(baseClient),
                    media: new MediaService(baseClient),
                    admin: new AdminService(baseClient)
                });

                return clientWithServices;
            } catch (error) {
                throw new Error(`Failed to connect to Mealie: ${error.message}`);
            }
        };
    }

    RED.nodes.registerType('mealie-server-config', MealieServerConfigNode, {
        credentials: {
            apiToken: { type: 'password' },
        },
    });
};
