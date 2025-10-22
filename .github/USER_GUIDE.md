# Quick Start Guide - Solution Advisor

## For End Users (Developers/Consultants)

### Creating a New Analysis

1. **Access the Application**
   - Navigate to the Solution Advisor home page
   - You'll see the Projects list

2. **Select Your Project**
   - Find your project in the list
   - Click on the project row
   - This will open the Analyses page filtered to your project

3. **Start a New Analysis**
   - Click the "New Analysis" button
   - The wizard will open with your project already selected
   - Click "Next" to proceed

4. **Enter Object Information**
   - **RICEFW ID**: Enter in format like `I-0042-IMP`
     - Click the hint icon (💡) for detailed format explanation
     - Click "View History" to see previous analyses for this ID
   - **Object Type**: Select from dropdown (Reports, Interfaces, etc.)
   - **Object Name**: Enter descriptive name
   - **Description**: Optional detailed description
   - Click "Next"

5. **Review Information**
   - Review the summary of your entries
   - See automatically loaded **Performance Constraints** for your object type
   - Browse **Real-World Examples** filtered by your context
     - Filter examples by industry or clean core level
     - Click examples to see full details
   - Click "Start Analysis" to begin

6. **Save Draft (Optional)**
   - At any point, click "Save Draft" to save your progress
   - You can resume later from where you left off
   - Session expires after 24 hours of inactivity

7. **Complete Analysis**
   - Answer decision questions (to be implemented in wizard flow)
   - System will calculate scores and recommendation
   - Navigate to Analysis Details to see results

8. **View Results**
   - See your **Clean Core Level** recommendation
   - Review **Scoring Metrics Dashboard**:
     - Technical Debt Score (lower is better)
     - Cloud Readiness Score (higher is better)
     - Upgrade Impact Score (lower is better)
     - Composite Health Score
   - Click **Decision Flowchart** tab to visualize your decision path
   - Export flowchart as PNG or SVG

---

## For Admins

### Managing Projects

1. **Create New Project**
   - Click "New Project" button
   - Fill in all required fields
   - Save

2. **Edit Existing Project**
   - Select a project by clicking its row (single selection mode)
   - Click "Edit Project" button (only visible to admins)
   - Update project details
   - Save changes

3. **View All Analyses**
   - Click "View All Analyses" to see analyses across all projects
   - Or click a specific project to see only its analyses

### Managing Users
- Grant project access to users (via XSUAA role configuration)
- Users will only see projects they have access to
- Users can only create analyses for projects they have access to

---

## Feature Reference

### Constraints Panel
- **Performance Thresholds**: Volume limits, size limits, frequency
- **Deployment Constraints**: Based on S/4HANA flavor (Cloud Public vs On-Premise)
- **Compliance Constraints**: SOX, GDPR, FDA requirements if applicable

### Examples Panel
- Real-world implementation examples
- Filter by:
  - Industry (Retail, Manufacturing, Healthcare, Finance, etc.)
  - Clean Core Level (A, B, C, D)
- Each example shows:
  - Challenge description
  - Solution approach
  - Technologies used
  - Volume handled
  - Performance achieved
  - Lessons learned

### Flowchart Visualization
- Visual representation of decision path
- Color-coded by final recommendation:
  - 🟢 Green: Level A (Fully Clean Core)
  - 🔵 Blue: Level B (Enhanced Clean Core)
  - 🟠 Orange: Level C (Compliant Modifications)
  - 🔴 Red: Level D (Legacy Customizations)
- Zoom controls for large flowcharts
- Export as PNG or SVG

### RICEFW ID History
- View all previous analyses for a RICEFW ID
- See evolution over time
- Copy decisions from previous analyses
- Maintain consistency across iterations

---

## Tips & Best Practices

1. **Use RICEFW History**
   - Before starting a new analysis, check if the object was analyzed before
   - Copy previous decisions as a starting point if business requirements haven't changed

2. **Review Constraints Early**
   - Check performance thresholds in the wizard
   - Adjust your approach if you're near limits
   - Plan for alternatives if constraints would be exceeded

3. **Learn from Examples**
   - Filter examples by your industry
   - Look for similar scenarios
   - Note the technologies and approaches used

4. **Save Drafts Regularly**
   - Long analyses can take time
   - Save drafts to avoid losing work
   - Resume later if interrupted

5. **Export Flowcharts**
   - Export flowcharts for documentation
   - Share with stakeholders for approval
   - Include in technical specifications

---

## Keyboard Shortcuts

- **Escape**: Close dialogs and popovers
- **Tab**: Navigate between form fields
- **Enter**: Submit forms and advance wizard steps

---

## Troubleshooting

### "No examples found"
- Try clearing industry/level filters
- Examples are loaded based on object type
- Contact admin to add more examples

### "Failed to load constraints"
- Check network connection
- Verify project is properly configured
- Contact admin if issue persists

### "Flowchart not displaying"
- Switch to the Flowchart tab to trigger generation
- Refresh the page if needed
- Ensure analysis has decision paths

### "Cannot see project"
- Verify you have access to the project
- Contact admin to grant access
- Check that project status is "Active"

---

## Support

For issues or questions:
1. Check this guide
2. Review the Implementation Summary document
3. Contact your system administrator
4. Refer to SAP Clean Core documentation

---

## Next Steps

After creating analyses:
1. Review recommendations with business stakeholders
2. Plan implementation based on clean core level
3. Track progress through project lifecycle
4. Update analyses as requirements evolve
