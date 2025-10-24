/**
 * E2E Tests - Complete Wizard Flow
 * 
 * Tests the full user journey through the Solution Advisor wizard
 */

describe('Solution Advisor - Wizard Flow', function() {
    
    it('should load the app and display the landing page', function() {
        browser.get(browser.params.appUrl);
        
        expect(browser.getTitle()).toBe('Solution Advisor');
        
        // Wait for app to load
        browser.wait(function() {
            return element(by.id('container-solutionadvisor---app')).isPresent();
        }, 10000);
    });
    
    it('should navigate to Analysis List page', function() {
        // Click on Fiori tile or navigation item
        element(by.control({
            controlType: 'sap.m.StandardListItem',
            properties: { title: 'Clean Core Analysis' }
        })).click();
        
        // Wait for list to load
        browser.wait(function() {
            return element(by.control({
                controlType: 'sap.m.Table'
            })).isPresent();
        }, 10000);
    });
    
    it('should open wizard from Create button', function() {
        // Click Create/Start Wizard button
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: 'Start Wizard' }
        })).click();
        
        // Wait for wizard dialog to open
        browser.wait(function() {
            return element(by.control({
                controlType: 'sap.m.Wizard'
            })).isPresent();
        }, 10000);
    });
    
    it('should complete Step 1 - Project Selection', function() {
        // Select project configuration
        element(by.control({
            controlType: 'sap.m.Select',
            id: /projectConfigSelect/
        })).click();
        
        // Select first project
        element(by.control({
            controlType: 'sap.ui.core.Item',
            properties: { key: browser.params.testProject }
        })).click();
        
        // Enter RICEFW ID
        element(by.control({
            controlType: 'sap.m.Input',
            id: /ricefwIdInput/
        })).sendKeys('I-0001-E2E');
        
        // Select object type
        element(by.control({
            controlType: 'sap.m.Select',
            id: /objectTypeSelect/
        })).click();
        
        element(by.control({
            controlType: 'sap.ui.core.Item',
            properties: { text: 'Interfaces' }
        })).click();
        
        // Click Next
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: 'Next' }
        })).click();
        
        // Wait for next step to load
        browser.sleep(1000);
    });
    
    it('should answer wizard questions', function() {
        // Answer first question (example: Integration method)
        element(by.control({
            controlType: 'sap.m.RadioButton',
            properties: { text: /OData API/ }
        })).click();
        
        // View constraints panel
        const constraintsPanel = element(by.control({
            controlType: 'sap.m.Panel',
            properties: { headerText: /Performance Constraints/ }
        }));
        expect(constraintsPanel.isPresent()).toBeTruthy();
        
        // View examples
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: /Show Examples/ }
        })).click();
        
        browser.sleep(1000);
        
        // Close examples dialog
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: 'Close' }
        })).click();
        
        // Click Next
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: 'Next' }
        })).click();
        
        browser.sleep(1000);
    });
    
    it('should complete wizard and show final recommendation', function() {
        // Continue answering questions until complete
        // (Simplified for E2E - actual test would loop through all questions)
        
        // Simulate answering remaining questions
        for (let i = 0; i < 3; i++) {
            const radioButton = element.all(by.control({
                controlType: 'sap.m.RadioButton'
            })).first();
            
            radioButton.click();
            browser.sleep(500);
            
            const nextButton = element(by.control({
                controlType: 'sap.m.Button',
                properties: { text: 'Next' }
            }));
            
            if (nextButton.isPresent()) {
                nextButton.click();
                browser.sleep(1000);
            }
        }
        
        // Check for final recommendation
        expect(element(by.control({
            controlType: 'sap.m.Text',
            properties: { text: /Recommended Level/ }
        })).isPresent()).toBeTruthy();
    });
    
    it('should display scoring dashboard', function() {
        // Navigate to scoring section
        const scoringPanel = element(by.control({
            controlType: 'sap.m.Panel',
            properties: { headerText: /Scoring Dashboard/ }
        }));
        
        expect(scoringPanel.isPresent()).toBeTruthy();
        
        // Check for Technical Debt Score
        expect(element(by.control({
            controlType: 'sap.m.ProgressIndicator',
            id: /technicalDebtScore/
        })).isPresent()).toBeTruthy();
        
        // Check for Cloud Readiness Score
        expect(element(by.control({
            controlType: 'sap.m.ProgressIndicator',
            id: /cloudReadinessScore/
        })).isPresent()).toBeTruthy();
    });
    
    it('should display decision flowchart', function() {
        // Click on Flowchart tab/section
        element(by.control({
            controlType: 'sap.m.IconTabFilter',
            properties: { text: 'Decision Path' }
        })).click();
        
        browser.sleep(1000);
        
        // Check for SVG flowchart
        expect(element(by.css('svg#decisionFlowchart')).isPresent()).toBeTruthy();
    });
    
    it('should save the analysis', function() {
        // Click Save button
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { text: 'Save' }
        })).click();
        
        browser.sleep(2000);
        
        // Check for success message
        expect(element(by.control({
            controlType: 'sap.m.MessageToast'
        })).isPresent()).toBeTruthy();
    });
    
    it('should export analysis to PDF', function() {
        // Click Export button
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { icon: 'sap-icon://download' }
        })).click();
        
        // Select PDF format
        element(by.control({
            controlType: 'sap.m.MenuItem',
            properties: { text: 'Export to PDF' }
        })).click();
        
        browser.sleep(2000);
        
        // Check for download confirmation
        expect(element(by.control({
            controlType: 'sap.m.MessageToast'
        })).isPresent()).toBeTruthy();
    });
    
    it('should navigate back to Analysis List', function() {
        // Click Back or navigation button
        element(by.control({
            controlType: 'sap.m.Button',
            properties: { icon: 'sap-icon://nav-back' }
        })).click();
        
        browser.sleep(1000);
        
        // Verify we're back at the list
        expect(element(by.control({
            controlType: 'sap.m.Table'
        })).isPresent()).toBeTruthy();
        
        // Verify new analysis is in the list
        expect(element(by.control({
            controlType: 'sap.m.ColumnListItem',
            descendant: {
                controlType: 'sap.m.Text',
                properties: { text: 'I-0001-E2E' }
            }
        })).isPresent()).toBeTruthy();
    });
});
