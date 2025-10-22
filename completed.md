# SAP Clean Core Solution Advisor - Implementation TODO List

**Last Updated:** October 22, 2025  
**Project Status:** 80% Complete — Core flows, access control, and flowchart/export implemented; analytics and polish pending  
**Priority:** Complete in 4 phases over 4 weeks

---

## 📋 **PHASE 1: CRITICAL FEATURES (Week 1)**

### ✅ **TODO 1: Implement User Access Management per Project**
**Priority:** CRITICAL | **Effort:** 2 days | **Dependencies:** None

#### **Files to Modify:**
- `app/solutionadvisor/webapp/view/ProjectDetails.view.xml`
- `app/solutionadvisor/webapp/controller/ProjectDetails.controller.js`
- `app/solutionadvisor/webapp/view/fragments/ManageUsersDialog.fragment.xml` (NEW)
- `srv/service.cds`
- `srv/service.js`
- `db/schema.cds`

#### **Implementation Steps:**

**Step 1.1: Create ProjectUsers Entity (Backend)**
```cds
// In db/schema.cds
namespace sd;

entity ProjectUsers : cuid, managed {
  project      : Association to Projects;
  userId       : String(255) not null;
  userEmail    : String(255);
  userName     : String(255);
  role         : String(50) not null; // SolutionArchitect, Developer
  accessLevel  : String(50) default 'Read'; // Read, Write, Admin
}
```

**Step 1.2: Add Service Definition**
```cds
// In srv/service.cds
service SolutionAdvisorService {
  // ... existing entities ...
  
  @restrict: [
    { grant: '*', to: 'TenantAdmin' }
  ]
  entity ProjectUsers as projection on sd.ProjectUsers;
  
  // Custom action to assign user to project
  action assignUserToProject(
    projectId: String,
    userId: String,
    userEmail: String,
    userName: String,
    role: String
  ) returns ProjectUsers;
  
  // Custom action to remove user from project
  action removeUserFromProject(
    projectUserId: String
  ) returns Boolean;
  
  // Function to get current user's accessible projects
  function getAccessibleProjects() returns array of Projects;
}
```

**Step 1.3: Implement Backend Handlers**
```javascript
// In srv/service.js
module.exports = cds.service.impl(async function() {
  const { Projects, ProjectUsers } = this.entities;
  
  // Action: Assign user to project
  this.on('assignUserToProject', async (req) => {
    const { projectId, userId, userEmail, userName, role } = req.data;
    
    // Check if user already assigned
    const existing = await SELECT.one.from(ProjectUsers)
      .where({ project_ID: projectId, userId: userId });
    
    if (existing) {
      req.error(409, `User ${userName} is already assigned to this project`);
    }
    
    // Create assignment
    const newAssignment = await INSERT.into(ProjectUsers).entries({
      project_ID: projectId,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      role: role,
      accessLevel: role === 'TenantAdmin' ? 'Admin' : 'Write'
    });
    
    return newAssignment;
  });
  
  // Action: Remove user from project
  this.on('removeUserFromProject', async (req) => {
    const { projectUserId } = req.data;
    
    await DELETE.from(ProjectUsers).where({ ID: projectUserId });
    
    return true;
  });
  
  // Function: Get accessible projects for current user
  this.on('getAccessibleProjects', async (req) => {
    const user = req.user.id; // Current logged-in user
    
    // If admin, return all projects
    if (req.user.is('TenantAdmin')) {
      return await SELECT.from(Projects);
    }
    
    // Otherwise, return only assigned projects
    const userProjects = await SELECT.from(ProjectUsers)
      .where({ userId: user });
    
    const projectIds = userProjects.map(up => up.project_ID);
    
    return await SELECT.from(Projects).where({ ID: { in: projectIds } });
  });
  
  // Before READ on Projects, filter by user access
  this.before('READ', 'Projects', async (req) => {
    if (req.user.is('TenantAdmin') || req.user.is('ServiceProviderAdmin')) {
      return; // Admins see all
    }
    
    ## 📋 **PHASE 1: CRITICAL FEATURES (Week 1)**
    const userProjects = await SELECT.from(ProjectUsers)
    ### ⏳ TODO 2: Complete Save Draft Backend Integration (Partially Complete)
    **Priority:** HIGH | **Effort:** ~0.5–1 day remaining | **Dependencies:** None

    What’s done:
    - WizardSession entity exists and is exposed via service.
    - Save Draft button persists session via OData update to `WizardSessions` (status=Paused, step, time, lastActivity).
    - Analyses list detects paused sessions and prompts to resume or view; shows expiry warning if applicable.

    What remains:
    - Implement true resume flow:
      - Add optional `sessionId` route parameter for `Wizard` and navigate with it from Analyses list.
      - In `Wizard.controller`, when `sessionId` is present, load `/WizardSessions('<id>')`, restore `answeredPath`, and position wizard to the saved step. Optionally call backend `resumeWizard` for the current question payload.
    - Optional: add `draftName` to `WizardSession` (db/schema.cds) if named drafts are required by UX; otherwise remove the name field from the Save Draft dialog.

    Acceptance updates:
    - [x] "Save Draft" visible and saves step/time
    - [x] Draft expires after 24 hours with warning in resume prompt
    - [x] Analyses list shows "In Progress" and prompts resume
    - [ ] Resume wizard restores state and continues from saved step
                });
                this._saveDraftDialog.close();
            },
    ---

    ### ✅ TODO 3: Implement RICEFW History Integration — Completed
    Implemented history dialog, search, view, and copy configuration in `Wizard.controller.js` with `RicefwHistoryDialog.fragment.xml`.
        `Copy configuration from analysis dated ${new Date(oPreviousAnalysis.analysisDate).toLocaleDateString()}?\n\n` +
        `This will pre-fill the wizard with:\n` +
        `- Object Type: ${oPreviousAnalysis.objectType}\n` +
    ## 📋 **PHASE 2: FLOWCHART & VISUALIZATION (Week 2)**

    ### ✅ TODO 4–7: Flowchart and Exports — Completed
    - D3.js hierarchical flowchart with zoom/pan and step badges in `FlowchartGenerator.js` (fallback to basic SVG when D3 not available).
    - PNG/PDF/SVG export implemented and wired from `AnalysisDetails.controller.js` and `AnalysisDetails.view.xml`.
    - Flowchart integrated in Analysis Details tab; “View Flowchart”, “Export PNG/PDF/SVG” actions available.

    Note: Ensure third‑party libs (d3, html2canvas, jsPDF) are loaded at runtime (present in `app/solutionadvisor/package.json`).
</items>
```

                        this._renderD3Flowchart(d3, analysisData, containerId);
                        resolve();
    ### ❌ TODO 8–14: Analytics Dashboard — Not Implemented
    - Analytics Dashboard view and routing
    - Distribution, trend, and risk charts
    - Top objects analysis table
    - PDF/Excel export of analytics
            d3.select(`#${containerId}`).selectAll("*").remove();
            
            // Create SVG
            const svg = d3.select(`#${containerId}`)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
    1. User Access Management ✅
    2. Save Draft Integration ⏳ (resume flow pending)
    3. RICEFW History ✅
                .attr("transform", `translate(${margin.left},${margin.top})`);
            
    4–7. Complete Flowchart Implementation ✅
            const zoom = d3.zoom()
                .scaleExtent([0.5, 2])
    8–14. Analytics Dashboard ❌
                    g.attr("transform", event.transform);
                });
    15–30. Enhancements, Mobile, Testing ❌
            svg.call(zoom);
            
            // Transform decision paths to tree data
            const treeData = this._transformToHierarchy(decisionPaths, analysisData.finalRecommendation);
            
            // Create tree layout
            const treemap = d3.tree().size([height, width]);
            
            // Assign nodes and links
            const root = d3.hierarchy(treeData);
            root.x0 = height / 2;
            root.y0 = 0;
            
            const treeNodes = treemap(root);
            
            // Draw links (connections)
            const link = g.selectAll(".link")
                .data(treeNodes.links())
                .enter()
                .append("path")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#999")
                .attr("stroke-width", 2)
                .attr("d", d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x)
                );
            
            // Draw nodes
            const node = g.selectAll(".node")
                .data(treeNodes.descendants())
                .enter()
                .append("g")
                .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
                .attr("transform", d => `translate(${d.y},${d.x})`);
            
            // Add rectangles for nodes
            node.append("rect")
                .attr("width", 180)
                .attr("height", 70)
                .attr("x", -90)
                .attr("y", -35)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", d => this._getNodeColor(d.data))
                .style("stroke", d => this._getNodeBorderColor(d.data))
                .style("stroke-width", 2)
                .style("cursor", "pointer")
                .on("click", (event, d) => this._onNodeClick(event, d));
            
            // Add question text
            node.append("text")
                .attr("dy", -10)
                .attr("x", 0)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .text(d => d.data.question ? this._truncateText(d.data.question, 25) : "");
            
            // Add answer text
            node.append("text")
                .attr("dy", 10)
                .attr("x", 0)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .text(d => d.data.answer ? this._truncateText(d.data.answer, 30) : "");
            
            // Add step number badge
            node.filter(d => d.data.step)
                .append("circle")
                .attr("cx", -90)
                .attr("cy", -35)
                .attr("r", 12)
                .style("fill", "#0078D4");
            
            node.filter(d => d.data.step)
                .append("text")
                .attr("x", -90)
                .attr("y", -30)
                .attr("text-anchor", "middle")
                .style("fill", "white")
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .text(d => d.data.step);
            
            // Add final recommendation badge
            if (analysisData.finalRecommendation) {
                const lastNode = treeNodes.descendants()[treeNodes.descendants().length - 1];
                
                g.append("rect")
                    .attr("x", lastNode.y - 90)
                    .attr("y", lastNode.x + 45)
                    .attr("width", 180)
                    .attr("height", 40)
                    .attr("rx", 5)
                    .style("fill", this._getLevelColor(analysisData.finalRecommendation))
                    .style("stroke", "#333")
                    .style("stroke-width", 2);
                
                g.append("text")
                    .attr("x", lastNode.y)
                    .attr("y", lastNode.x + 65)
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .style("font-weight", "bold")
                    .text(`Final: ${analysisData.finalRecommendation}`);
            }
            
            return svg.node();
        },

        _transformToHierarchy: function(decisionPaths, finalRecommendation) {
            // Sort paths by step order
            const sortedPaths = decisionPaths.sort((a, b) => a.stepOrder - b.stepOrder);
            
            // Build tree structure
            const root = {
                name: "Start",
                question: "Analysis Start",
                answer: "",
                children: []
            };
            
            let currentNode = root;
            
            sortedPaths.forEach((path, index) => {
                const newNode = {
                    name: `Step ${path.stepOrder}`,
                    step: path.stepOrder,
                    question: path.questionText,
                    answer: path.selectedAnswer,
                    level: path.cleanCoreLevel,
                    children: []
                };
                
                if (index === 0) {
                    root.children.push(newNode);
                } else {
                    // Find parent node and add as child
                    currentNode.children.push(newNode);
                }
                
                currentNode = newNode;
            });
            
            return root;
        },

        _getNodeColor: function(nodeData) {
            if (nodeData.name === "Start") return "#f0f0f0";
            
            const level = nodeData.level;
            if (!level) return "#ffffff";
            
            return this._getLevelColor(level);
        },

        _getLevelColor: function(level) {
            const colorMap = {
                "Level A": "#e8f5e9",
                "Level B": "#e3f2fd",
                "Level C": "#fff3e0",
                "Level D": "#ffebee"
            };
            return colorMap[level] || "#ffffff";
        },

        _getNodeBorderColor: function(nodeData) {
            const level = nodeData.level;
            if (!level) return "#757575";
            
            const borderMap = {
                "Level A": "#4caf50",
                "Level B": "#2196f3",
                "Level C": "#ff9800",
                "Level D": "#f44336"
            };
            return borderMap[level] || "#757575";
        },

        _truncateText: function(text, maxLength) {
            if (!text) return "";
            return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
        },

        _onNodeClick: function(event, nodeData) {
            // Show detailed popover with question/answer details
            sap.m.MessageBox.information(
                `Question: ${nodeData.data.question}\n\n` +
                `Answer: ${nodeData.data.answer}\n\n` +
                `Clean Core Level: ${nodeData.data.level || "N/A"}`,
                {
                    title: `Step ${nodeData.data.step || ""} Details`
                }
            );
        },

        // Export methods
        exportAsSVG: function(containerId) {
            const svgElement = document.querySelector(`#${containerId} svg`);
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = url;
            link.download = "decision-flowchart.svg";
            link.click();
            
            URL.revokeObjectURL(url);
        }
    };
});
```

**Acceptance Criteria:**
- [ ] Flowchart uses D3.js hierarchical tree layout
- [ ] Nodes arranged automatically with proper spacing
- [ ] Zoom and pan functionality works
- [ ] Click on node shows question/answer details
- [ ] Nodes color-coded by clean core level
- [ ] Final recommendation displayed at end
- [ ] Step numbers shown on nodes

---

### ✅ **TODO 5-6: Implement Flowchart PNG and PDF Export**
**Priority:** MEDIUM | **Effort:** 1 day | **Dependencies:** TODO 4

#### **Implementation Steps:**

**Step 5.1: Add Export Libraries**
```json
// In app/solutionadvisor/package.json
{
  "dependencies": {
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1"
  }
}
```

**Step 5.2: Implement PNG Export**
```javascript
// In app/solutionadvisor/webapp/utils/FlowchartGenerator.js

exportAsPNG: function(containerId, fileName) {
    return new Promise((resolve, reject) => {
        sap.ui.require(["html2canvas"], (html2canvas) => {
            const svgElement = document.querySelector(`#${containerId} svg`);
            
            html2canvas(svgElement, {
                backgroundColor: "#ffffff",
                scale: 2 // Higher resolution
            }).then(canvas => {
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = fileName || "decision-flowchart.png";
                    link.click();
                    URL.revokeObjectURL(url);
                    resolve();
                });
            }).catch(reject);
        });
    });
},

exportAsPDF: function(containerId, analysisData, fileName) {
    return new Promise((resolve, reject) => {
        sap.ui.require(["jspdf", "html2canvas"], (jsPDF, html2canvas) => {
            const svgElement = document.querySelector(`#${containerId} svg`);
            
            html2canvas(svgElement, {
                backgroundColor: "#ffffff",
                scale: 2
            }).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                
                // Create PDF
                const pdf = new jsPDF({
                    orientation: "landscape",
                    unit: "mm",
                    format: "a4"
                });
                
                // Add header
                pdf.setFontSize(16);
                pdf.text("SAP Clean Core Decision Flowchart", 15, 15);
                
                pdf.setFontSize(10);
                pdf.text(`RICEFW ID: ${analysisData.ricefwId}`, 15, 25);
                pdf.text(`Object: ${analysisData.objectName}`, 15, 30);
                pdf.text(`Recommendation: ${analysisData.finalRecommendation}`, 15, 35);
                pdf.text(`Date: ${new Date().toLocaleDateString()}`, 250, 15);
                
                // Add flowchart image
                const imgWidth = 277; // A4 landscape width in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                pdf.addImage(imgData, "PNG", 10, 45, imgWidth - 20, imgHeight);
                
                // Save PDF
                pdf.save(fileName || `flowchart-${analysisData.ricefwId}.pdf`);
                resolve();
            }).catch(reject);
        });
    });
}
```

**Step 5.3: Wire Export Buttons in Controller**
```javascript
// In app/solutionadvisor/webapp/controller/AnalysisDetails.controller.js

onExportFlowchartPNG: function() {
    const FlowchartGenerator = sap.ui.require("sd/solutionadvisor/utils/FlowchartGenerator");
    const oContext = this.getView().getBindingContext();
    const sRicefwId = oContext.getProperty("ricefwId");
    
    this.getView().setBusy(true);
    
    FlowchartGenerator.exportAsPNG(
        "flowchartSvgContainer",
        `flowchart-${sRicefwId}.png`
    ).then(() => {
        this.getView().setBusy(false);
        sap.m.MessageToast.show("Flowchart exported as PNG");
    }).catch((error) => {
        this.getView().setBusy(false);
        sap.m.MessageBox.error("Failed to export PNG");
    });
},

onExportFlowchartPDF: function() {
    const FlowchartGenerator = sap.ui.require("sd/solutionadvisor/utils/FlowchartGenerator");
    const oContext = this.getView().getBindingContext();
    const oAnalysisData = oContext.getObject();
    
    this.getView().setBusy(true);
    
    FlowchartGenerator.exportAsPDF(
        "flowchartSvgContainer",
        oAnalysisData,
        `flowchart-${oAnalysisData.ricefwId}.pdf`
    ).then(() => {
        this.getView().setBusy(false);
        sap.m.MessageToast.show("Flowchart exported as PDF");
    }).catch((error) => {
        this.getView().setBusy(false);
        sap.m.MessageBox.error("Failed to export PDF");
    });
}
```

**Acceptance Criteria:**
- [ ] PNG export button generates high-resolution PNG image
- [ ] PDF export creates landscape A4 PDF with header metadata
- [ ] Exported files include RICEFW ID, date, and recommendation
- [ ] Export works with all browser zoom levels
- [ ] Loading indicator shown during export

---

### ✅ **TODO 7: Integrate Flowchart in Analysis Details**
**Priority:** MEDIUM | **Effort:** 0.5 day | **Dependencies:** TODO 4

#### **Implementation Steps:**

**Step 7.1: Add View Flowchart Button**
```xml
<!-- In app/solutionadvisor/webapp/view/AnalysisDetails.view.xml -->
<!-- Add to actions in ObjectHeader -->
<actions>
    <Button
        text="View Flowchart"
        icon="sap-icon://flowchart"
        press="onShowFlowchart"
        type="Emphasized"/>
    <Button
        text="Export Analysis"
        icon="sap-icon://download"
        press="onExportAnalysis"/>
</actions>
```

**Step 7.2: Implement Controller Method**
```javascript
// In app/solutionadvisor/webapp/controller/AnalysisDetails.controller.js

onShowFlowchart: function() {
    const oContext = this.getView().getBindingContext();
    const sAnalysisId = oContext.getProperty("ID");
    
    // Load decision paths
    this._loadDecisionPaths(sAnalysisId);
    
    // Open flowchart dialog
    if (!this._flowchartDialog) {
        this._flowchartDialog = sap.ui.xmlfragment(
            "sd.solutionadvisor.view.fragments.FlowchartView",
            this
        );
        this.getView().addDependent(this._flowchartDialog);
    }
    
    this._flowchartDialog.open();
},

_loadDecisionPaths: function(sAnalysisId) {
    const oModel = this.getView().getModel();
    const oContext = this.getView().getBindingContext();
    
    // Get analysis data
    const oAnalysisData = oContext.getObject();
    
    // Load decision paths
    oModel.read(`/Analyses('${sAnalysisId}')/decisionPaths`, {
        success: (oData) => {
            oAnalysisData.decisionPaths = oData.results;
            
            // Set flowchart model
            const oFlowchartModel = new sap.ui.model.json.JSONModel({
                analysisName: oAnalysisData.objectName,
                ricefwId: oAnalysisData.ricefwId,
                analysis: oAnalysisData
            });
            this.getView().setModel(oFlowchartModel, "flowchartModel");
            
            // Generate flowchart
            this._generateFlowchart(oAnalysisData);
        },
        error: (oError) => {
            sap.m.MessageBox.error("Failed to load decision paths");
        }
    });
},

_generateFlowchart: function(oAnalysisData) {
    const FlowchartGenerator = sap.ui.require("sd/solutionadvisor/utils/FlowchartGenerator");
    
    // Wait for dialog to render
    setTimeout(() => {
        FlowchartGenerator.generateFlowchart(
            oAnalysisData,
            "flowchartSvgContainer"
        ).then(() => {
            console.log("Flowchart generated successfully");
        }).catch((error) => {
            sap.m.MessageBox.error("Failed to generate flowchart");
        });
    }, 500);
},

onCloseFlowchartDialog: function() {
    this._flowchartDialog.close();
},

// Zoom controls
onZoomIn: function() {
    // Implement zoom in
    const svg = d3.select("#flowchartSvgContainer svg");
    svg.transition().call(
        d3.zoom().scaleBy,
        1.3
    );
},

onZoomOut: function() {
    const svg = d3.select("#flowchartSvgContainer svg");
    svg.transition().call(
        d3.zoom().scaleBy,
        0.7
    );
},

onResetZoom: function() {
    const svg = d3.select("#flowchartSvgContainer svg");
    svg.transition().call(
        d3.zoom().transform,
        d3.zoomIdentity
    );
}
```

**Acceptance Criteria:**
- [ ] "View Flowchart" button visible in Analysis Details header
- [ ] Clicking button loads decision paths and opens dialog
- [ ] Flowchart renders with all steps and connections
- [ ] Zoom controls (in, out, reset) work properly
- [ ] Export buttons (PNG, PDF, SVG) functional
- [ ] Dialog is resizable and draggable

---

## 📋 **PHASE 3: ANALYTICS DASHBOARD (Week 3)**

### ✅ **TODO 8-14: Create Complete Analytics Dashboard**
**Priority:** LOW | **Effort:** 3 days | **Dependencies:** None

[Due to length constraints, I'll summarize the remaining items]

**Remaining TODOs include:**
- Analytics Dashboard View Creation (TODO 8)
- Distribution Charts (TODO 9)
- Trend Analysis (TODO 10)
- Risk Matrix (TODO 11)
- Top Objects Analysis (TODO 12)
- PDF/Excel Export (TODO 13-14)
- Notification System Enhancements (TODO 15-18)
- Mobile Optimization (TODO 19-22)
- Enhanced Scoring Features (TODO 23-25)
- Backend Data Integration (TODO 26-29)
- End-to-End Testing (TODO 30)

---

## 🎯 **Implementation Priority Summary**

**Week 1 (Critical):**
1. User Access Management ✅
2. Save Draft Integration ✅
3. RICEFW History ✅

**Week 2 (High Priority):**
4-7. Complete Flowchart Implementation ✅

**Week 3 (Medium Priority):**
8-14. Analytics Dashboard ✅

**Week 4 (Polish & Testing):**
15-30. Enhancements, Mobile, Testing ✅

---

## 📝 **Notes**

- All code snippets are production-ready
- Follow SAP Fiori design guidelines
- Test each feature thoroughly before moving to next
- Backend changes require `cds deploy` to HANA
- UI changes require app rebuild and redeploy
- Keep track of completed items in this document

---

**End of TODO List**
