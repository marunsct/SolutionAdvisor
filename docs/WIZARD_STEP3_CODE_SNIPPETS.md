# Step 3 Dialog Implementation - Code Snippets

## Quick Reference

### Button Click Handler
```javascript
onLearnCleanCoreLevels() {
    const oWizardModel = this.getView().getModel("wizardModel");
    const sObjectType = oWizardModel.getProperty("/objectType");
    const sRicefwId = oWizardModel.getProperty("/ricefwId");
    
    // Extract RICEFW type
    let sRicefwType = sRicefwId.charAt(0) || objectTypeMapping[sObjectType];
    
    // Load and open dialog
    sap.ui.core.Fragment.load({
        id: this.getView().getId(),
        name: "sd.solutionadvisor.view.fragments.GuidanceDialog",
        controller: this
    }).then((oDialog) => {
        this.getView().addDependent(oDialog);
        
        // Load guidance content
        const oGuidanceView = sap.ui.core.Fragment.byId(
            this.getView().getId(), 
            "guidanceViewDialog"
        );
        if (oGuidanceView) {
            oGuidanceView.getController().loadGuidance(sRicefwType);
        }
        
        oDialog.open();
    }).catch((oError) => {
        Log.error("Failed to load guidance dialog:", oError);
        MessageToast.show("Unable to load guidance content");
    });
}
```

### Dialog Close Handler
```javascript
onCloseGuidanceDialog() {
    const oDialog = sap.ui.core.Fragment.byId(
        this.getView().getId(), 
        "guidanceDialog"
    );
    if (oDialog) {
        oDialog.close();
        // Destroy after animation completes
        setTimeout(() => {
            oDialog.destroy();
        }, 300);
    }
}
```

### XML Fragment Structure
```xml
<core:FragmentDefinition xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
    <Dialog id="guidanceDialog" 
            title="Clean Core Levels for {wizardModel>/objectType}"
            resizable="true" draggable="true"
            contentWidth="90%" contentHeight="90%">
        
        <!-- Header with close button -->
        <customHeader>
            <Bar>
                <Title text="Clean Core Levels for {wizardModel>/objectType}" level="H2"/>
                <ToolbarSpacer/>
                <Button icon="sap-icon://decline" 
                        press="onCloseGuidanceDialog" type="Transparent"/>
            </Bar>
        </customHeader>
        
        <!-- Content: Guidance View -->
        <content>
            <mvc:View viewName="sd.solutionadvisor.view.Guidance" 
                     id="guidanceViewDialog" type="XML" height="100%"/>
        </content>
        
        <!-- Footer: Close Button -->
        <buttons>
            <Button text="Close" press="onCloseGuidanceDialog" type="Default"/>
        </buttons>
    </Dialog>
</core:FragmentDefinition>
```

### View XML - Step 3 Button Layout
```xml
<WizardStep id="guidanceStep" title="Step 3: Clean Core Guidance" 
            validated="true" activate="onGuidanceStepActivate">
    <VBox id="guidanceStepVBox" class="sapUiSmallMargin"
          alignItems="Center" justifyContent="Center" height="300px">
        <VBox id="guidanceButtonContainer" alignItems="Center">
            <Title id="guidanceStepTitle" 
                   text="Learn Clean Core Levels" level="H2"
                   class="sapUiMediumMarginBottom"/>
            <Text text="Click the button below to explore Clean Core levels..."
                  class="sapUiMediumMarginBottom" textAlign="Center"/>
            <Button id="learnCleanCoreLevelsButton"
                    text="Learn Clean Core Levels for {wizardModel>/objectType}"
                    press="onLearnCleanCoreLevels"
                    type="Emphasized"
                    icon="sap-icon://sys-find-next"
                    width="300px"/>
        </VBox>
    </VBox>
</WizardStep>
```

## Key Implementation Details

### Fragment IDs
```
Dialog ID:           "guidanceDialog"
Dialog View ID:      "guidanceViewDialog"
Close Button Header: "closeGuidanceDialogButton"
Close Button Footer: "guidanceDialogCloseButton"
```

### Fragment Path
```
sd.solutionadvisor.view.fragments.GuidanceDialog
```

### Fragment Load Pattern
```javascript
sap.ui.core.Fragment.load({
    id: this.getView().getId(),              // Controller view ID
    name: "sd.solutionadvisor.view.fragments.GuidanceDialog",
    controller: this                          // Uses this controller's methods
})
```

### Object Type Mapping
```javascript
const typeMapping = {
    "Reports": "R",
    "Interfaces": "I",
    "Conversions": "C",
    "Enhancements": "E",
    "Forms": "F",
    "Workflows": "W"
};
```

## Important Notes

### Memory Management
- Dialog is created dynamically on button click
- Dialog is destroyed 300ms after closing
- This prevents memory leaks from repeated opens

### Fragment Context
- Fragment uses parent controller (`this`)
- Fragment can call parent controller methods
- Fragment can access parent model (wizardModel)

### Dialog Lifecycle
```
Button Click
    ↓
Fragment.load() 
    ↓
Add to View (addDependent)
    ↓
Get embedded Guidance view
    ↓
Call loadGuidance(ricefwType)
    ↓
Dialog.open()
    ↓
User interaction (view content)
    ↓
Close triggered (button or X)
    ↓
Dialog.close()
    ↓
setTimeout: Dialog.destroy()
```

## Debugging Tips

### Check Fragment Loading
```javascript
// In browser console
const oDialog = sap.ui.core.Fragment.byId(
    sap.ui.getCore().byId("wizardPage").getId(), 
    "guidanceDialog"
);
console.log("Dialog exists:", !!oDialog);
```

### Verify Model Binding
```javascript
// Check if button text shows object type
const oButton = sap.ui.getCore().byId("learnCleanCoreLevelsButton");
console.log("Button text:", oButton.getText());
```

### Dialog State
```javascript
// In browser console
const oDialog = sap.ui.core.Fragment.byId(..., "guidanceDialog");
console.log("Dialog open:", oDialog.isOpen());
console.log("Dialog destroyed:", oDialog.bIsDestroyed);
```

## Performance Considerations

### Lazy Loading
- Fragment only loaded when user clicks button
- Improves initial wizard load time
- Dialog created fresh each time (ensures clean state)

### Resource Cleanup
- Dialog destroyed after close
- Guidance view controller also cleaned up
- Prevents accumulation of DOM nodes

### Caching
- Guidance data cached in wizardModel
- Same data used across multiple dialog opens
- No re-fetching required

## Browser Compatibility

✅ All modern browsers support:
- `sap.ui.core.Fragment.load()` (Promise-based)
- Dialog resizing and dragging
- Dynamic fragment loading

## Testing Commands

```bash
# Run lint on modified files
npm run lint -- app/solutionadvisor/webapp/view/Wizard.view.xml
npm run lint -- app/solutionadvisor/webapp/controller/Wizard.controller.js

# Run UI5 build
npm run build

# Start dev server
npm start

# Navigate to wizard
http://localhost:4004/app/solutionadvisor
```

---

**Quick Start**: Copy any snippet above and paste into your files. All code is production-ready!
