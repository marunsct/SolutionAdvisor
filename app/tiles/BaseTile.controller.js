sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    /**
     * Base Controller for all tile views
     * Handles navigation to target applications
     */
    return Controller.extend("sd.solutionadvisor.tiles.BaseTile", {
        
        /**
         * Handle tile press event
         * Navigates to the target application defined in FLP configuration
         */
        onPress: function () {
            // Get the tile component (owner component of this view)
            const oComponent = this.getOwnerComponent();
            
            if (!oComponent) {
                console.error("Cannot navigate: Component not found");
                return;
            }
            
            // Get navigation target from component data
            const oComponentData = oComponent.getComponentData();
            const oTileConfig = oComponentData?.startupParameters?.tileConfiguration?.[0];
            
            // Extract semantic object and action from tile configuration
            let sSemanticObject, sAction;
            
            if (oTileConfig) {
                try {
                    const oConfig = JSON.parse(oTileConfig);
                    sSemanticObject = oConfig.semantic_object;
                    sAction = oConfig.semantic_action;
                } catch (e) {
                    console.error("Failed to parse tile configuration", e);
                }
            }
            
            // Fallback: Try to get from component properties
            if (!sSemanticObject || !sAction) {
                const oTarget = oComponentData?.properties?.target;
                if (oTarget) {
                    sSemanticObject = oTarget.semanticObject;
                    sAction = oTarget.action;
                }
            }
            
            // Navigate using CrossApplicationNavigation
            if (sSemanticObject && sAction && sap.ushell && sap.ushell.Container) {
                const oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
                const sHash = oCrossAppNav.hrefForExternal({
                    target: {
                        semanticObject: sSemanticObject,
                        action: sAction
                    }
                });
                oCrossAppNav.toExternal({ target: { shellHash: sHash } });
            } else {
                console.error("Navigation failed: Missing semantic object/action or FLP Container");
            }
        }
    });
});
