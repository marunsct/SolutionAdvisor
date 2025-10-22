# Mock Services for SAP Clean Core Solution Advisor

This directory contains mock service implementations for the SAP Clean Core Solution Advisor application. These mock services enable developers to test the application without requiring a backend connection.

## Overview

The mock services provide simulated data and responses for various backend operations, including:

- Starting wizard analyses
- Getting and submitting answers in the decision tree
- Getting constraints and performance thresholds
- Getting contextual examples
- Generating analysis results

## Usage

To use the mock services during development:

1. Add `?mock=true` to the application URL, or
2. Set `localStorage.setItem('mockMode', 'true')` in the browser console

## Files

- `MockService.js` - Main entry point that initializes all mock services
- `MockAnalysisService.js` - Provides mock implementation of the analysis service
- `mockdata/` - Directory containing mock data files

## Implementation

The mock services are integrated with the application through the Component.js file, which checks for mock mode and initializes the appropriate services. When mock mode is active, the controllers use the mock services instead of making backend calls.

## Example

```javascript
// In Component.js
_initMockServices: function() {
    if (this._isMockModeActive()) {
        sap.ui.require(["sd/solutionadvisor/localService/MockService"], (MockService) => {
            MockService.init();
            this.mockAnalysisService = MockService.getAnalysisService();
        });
    }
}
```

## Development

When extending the mock services, please ensure:

1. All mock data follows the same structure as real backend data
2. Mock services handle errors in a similar way to the backend
3. Each mock service is focused on a specific functionality area

## Testing

To test the application with mock services, run the application with the URL parameter `?mock=true` and verify that:

1. The wizard can be started without backend connection
2. Question navigation works correctly
3. Constraints and examples are displayed appropriately
4. Analysis results are generated and displayed
