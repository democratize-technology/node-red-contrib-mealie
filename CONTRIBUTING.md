# Contributing to node-red-contrib-mealie

Thank you for your interest in contributing to node-red-contrib-mealie! This document provides guidelines and instructions for contributing.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:

- Check the existing issues to see if the problem has already been reported
- Ensure you're using the latest version of the library
- Collect information about the bug (Node.js version, steps to reproduce, etc.)

When submitting a bug report, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Any relevant code snippets or error messages
- Your environment details (Node.js version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! When suggesting an enhancement, please:

- Use a clear and descriptive title
- Provide a detailed description of the proposed enhancement
- Explain why this enhancement would be useful to most users

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the tests to ensure they pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### Pull Request Guidelines

- Ensure any code changes are covered by tests
- Follow the existing code style
- Keep pull requests focused on a single change
- Document new code based on the existing documentation style
- Update the README.md with details of changes if appropriate

## Style Guidelines

- Use modern JavaScript features
- Add JSDoc comments for all public methods and classes
- Follow existing code formatting conventions

## Project Architecture

node-red-contrib-mealie uses a domain-operation architecture pattern:

- Each domain (recipe, household, shopping, etc.) is represented by a single Node-RED node
- Operations within each domain are handled by a configurable 'operation' property
- Messages follow a standard format with operation and parameters

See the documentation in the `docs/` directory for more details on the architecture.

## Testing

All contributions should include appropriate tests:

- Run `npm test` to ensure all existing tests pass
- Add new tests for any new functionality
- Maintain or improve the current test coverage

## Documentation

Please update the documentation when making changes:

- Update the README.md for significant changes
- Update or add help text for nodes
- Add example flows for new functionality
- Document new operations or parameters

Thank you for contributing!
