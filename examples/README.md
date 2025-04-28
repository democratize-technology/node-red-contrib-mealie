# Node-RED Mealie Examples

This directory contains example flows demonstrating how to use the domain-operation nodes for common Mealie API use cases.

Each example file is in Node-RED's JSON flow format and can be imported directly into your Node-RED instance.

## Examples Overview

- **recipe-operations.json**: Examples of common recipe operations (search, get, create, update, delete)
- **household-shopping.json**: Examples of household and shopping list management operations
- **mealplan-organizer.json**: Examples of meal planning and organization operations
- **admin-operations.json**: Examples of administrative operations
- **parser-utility.json**: Examples of utility and parser operations

## How to Import

1. Open your Node-RED instance
2. Click on the menu in the top-right corner
3. Select "Import" from the dropdown menu
4. Select "Clipboard" tab
5. Click "select a file to import"
6. Navigate to the examples directory and select an example file
7. Click "Import" button

## Prerequisites

- Node-RED v2.0.0 or later
- Mealie server with API access
- Appropriate credentials with permissions for the operations you want to perform

## Note

These examples assume you have already configured a Mealie server connection node (`mealie-server-config`) with appropriate credentials.
