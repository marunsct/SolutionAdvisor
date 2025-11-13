# Wizard Step 3 Enhancement - Dialog Implementation

## Changes Made

### 1. **Modified: Wizard.view.xml (Step 3)**
   - **Previous behavior**: Embedded Guidance view directly in the wizard step
   - **New behavior**: Shows a centered container with title, description, and button
   
   **Changes**:
   - Removed `<core:mvc.View>` that directly embedded the Guidance view
   - Added VBox container with centered alignment and 300px height
   - Added descriptive title: "Learn Clean Core Levels"
   - Added descriptive text explaining what users will learn
   - Added primary button: "Learn Clean Core Levels for {objectType}"
     - Button text dynamically shows selected object type from Step 2
     - Button press handler: `onLearnCleanCoreLevels`
     - Icon: `sap-icon://sys-find-next`
     - Width: 300px for good visibility

### 2. **Created: GuidanceDialog.fragment.xml**
   - New dialog fragment for displaying Clean Core Guidance content
   - Dialog is resizable and draggable for flexibility
   - **Dialog Header**:
     - Title: "Clean Core Levels for {objectType}" (dynamic binding)
     - Close button (X icon) in toolbar
   - **Dialog Content**:
     - Embeds the Guidance view (same as before, but in a dialog)
   - **Dialog Footer**:
     - Close button for easy navigation
   - **Dialog Sizing**:
     - Content width: 90% of viewport
     - Content height: 90% of viewport
     - Responsive margins applied

### 3. **Added: Wizard.controller.js Methods**

   **Method 1: `onLearnCleanCoreLevels()`**
   - Triggered when user clicks the button in Step 3
   - Extracts RICEFW type from ricefwId or maps objectType name
   - Loads dialog fragment dynamically using `sap.ui.core.Fragment.load()`
   - Adds dialog as dependent to current view
   - Loads guidance content in the dialog using Guidance controller's `loadGuidance()` method
   - Opens the dialog
   - Includes error handling with user-friendly messages

   **Method 2: `onCloseGuidanceDialog()`**
   - Triggered when user clicks Close button in dialog or footer
   - Closes the dialog
   - Destroys dialog after 300ms to free up resources
   - Prevents memory leaks from repeated dialog opens

## User Experience Flow

1. **Step 1**: User selects a project
2. **Step 2**: User selects object type (e.g., "Reports", "Interfaces")
3. **Step 3** (NEW): 
   - User sees a clean layout with:
     - Title: "Learn Clean Core Levels"
     - Description: "Click the button below to explore..."
     - Button: "Learn Clean Core Levels for Reports" (example)
   - User clicks the button
   - Dialog opens showing full guidance content for the selected object type
   - Dialog has:
     - Resizable/draggable layout
     - Close button (X) in header
     - Close button in footer
     - Full Guidance view content inside
4. User closes dialog (button, X icon, or dialog close)
5. User can click button again to re-open guidance
6. Step 3 is automatically validated (no input required)
7. **Step 4**: "Ready to Start" summary
8. **Step 5+**: Dynamic questions

## Benefits

- ✅ Cleaner Step 3 layout with clear call-to-action
- ✅ Dialog prevents navigation away from wizard (modal)
- ✅ Resizable dialog allows users to see both guidance and wizard context
- ✅ Reusable dialog pattern for other modals
- ✅ Dynamic button text shows which object type user selected
- ✅ Resource cleanup prevents memory leaks
- ✅ User can refer back to guidance while answering questions if needed
- ✅ Maintains original Guidance view functionality (no changes needed there)

## Files Modified

1. `/app/solutionadvisor/webapp/view/Wizard.view.xml` - Step 3 layout
2. `/app/solutionadvisor/webapp/controller/Wizard.controller.js` - Dialog methods
3. `/app/solutionadvisor/webapp/view/fragments/GuidanceDialog.fragment.xml` - NEW dialog definition

## Testing Checklist

- [ ] Step 3 displays button with correct object type name
- [ ] Button click opens dialog
- [ ] Dialog displays guidance content correctly
- [ ] Close button (X) in header works
- [ ] Close button in footer works
- [ ] Dialog is resizable and draggable
- [ ] Dialog opens/closes without errors
- [ ] Multiple open/close cycles work correctly
- [ ] Guidance content loads correctly for all RICEFW types (R, I, C, E, F, W)
- [ ] Dialog closes when user navigates wizard steps
- [ ] No console errors or warnings
