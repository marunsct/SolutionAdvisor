# Clean Core Solution Advisor - User Guide
## For Functional Consultants

**Version:** 1.0  
**Last Updated:** December 2025  
**Audience:** Functional Consultants, Business Analysts, Requirements Specialists

---

## Table of Contents
1. [What Is This Application?](#what-is-this-application)
2. [How To Get Started](#how-to-get-started)
3. [Step-by-Step: Creating a New Analysis](#step-by-step-creating-a-new-analysis)
4. [Understanding the Results](#understanding-the-results)
5. [Managing Your Projects](#managing-your-projects)
6. [Tips & Best Practices](#tips--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## What Is This Application?

### In Simple Words
This is a **decision-making guide** that helps you choose the best way to build custom requirements in SAP S/4HANA projects.

Think of it like a GPS for your requirements:
- You tell it what you need to build (report, interface, form, etc.)
- It asks you simple questions about your project
- It recommends the safest, cleanest approach
- It shows you the risks and effort involved

### What Does It Do?
1. **Guides you through questions** - Asks about your requirement, project setup, and constraints
2. **Recommends an approach** - Tells you the best technical path (Level A, B, C, or D)
3. **Shows scores** - Displays technical debt, cloud readiness, and upgrade impact
4. **Explains constraints** - What's allowed and what's not in your cloud/on-premise setup
5. **Provides examples** - Real-world cases you can follow
6. **Saves everything** - Keeps records for your project audit trail

### Who Should Use This?
- ✅ Functional Consultants (gathering requirements)
- ✅ Solution Architects (designing approaches)
- ✅ Business Analysts (documenting decisions)
- ✅ Project Managers (tracking technical decisions)

### When Should You Use It?
**Right after creating a RICEFW ID** - As soon as you've defined a new requirement, run this wizard to decide the technical approach.

---

## How To Get Started

### Step 1: Access the Application
1. Open the **SAP Fiori Launchpad** in your browser
2. Look for the **"Clean Core Solution Advisor"** tile
3. Click the tile to open the application

### Step 2: Understand the Main Screen
When you open the app, you'll see several options:

- **"New Analysis"** - Start analyzing a new RICEFW requirement
- **"My Projects"** - See all projects you're working on
- **"My Analyses"** - View all your previous analyses
- **"Analytics"** - See project-wide clean core health (optional)

### Step 3: Know Your Project Details (First Time Only)
Before starting an analysis, you need to know:
- **Project Name** - What SAP project are you working on? (e.g., "ACME S/4HANA Migration")
- **SAP Setup** - Is it S/4HANA Cloud or On-Premise?
- **Available Services** - What BTP services can you use? (Optional but helpful)
- **Timeline** - When is this project scheduled?

---

## Step-by-Step: Creating a New Analysis

### Phase 1: Create/Select Your Project

#### Option A: Create a New Project (First Time)
1. Click **"New Analysis"** button
2. Click **"Create New Project"** (if project doesn't exist)
3. Fill in these required fields:
   - **Client Name** - Your organization name
   - **Project Name** - Name of the S/4HANA project
   - **Project Type** - New Implementation / System Conversion / Upgrade
   - **S/4HANA Flavor** - Choose one:
     - 🔵 **Cloud Public** - SAP-hosted cloud (most restrictive)
     - 🔵 **Cloud Private** - Your own cloud (moderate restrictions)
     - 🔵 **On-Premise** - Your data center (most flexible)
   - **Timeline** - Pick the project start date

4. Optional fields (leave blank if unsure):
   - **Team Size** - Number of developers
   - **Budget Range** - Small/Medium/Large/Enterprise
   - **Governance** - Centralized/Federated (for large organizations)
   - **Compliance** - Any regulations? (SOX, GDPR, etc.)

5. Click **"Create Project"**

#### Option B: Select Existing Project
1. Click **"New Analysis"** button
2. In the **"Select Project"** dropdown, pick your project name
3. Click **"Continue"**

---

### Phase 2: Describe What You're Building (Object Information)

#### Step 1: Choose Object Type
You'll see 6 options. Pick ONE that matches what you need to build:

| Icon | Type | Meaning | Examples |
|------|------|---------|----------|
| 📊 | **Report (R)** | Show data to users | Sales dashboards, P&L reports, aging lists |
| 🔗 | **Interface (I)** | Connect systems | Exchange data with HR system, external analytics |
| 🔄 | **Conversion (C)** | Migrate old data | Move legacy data into S/4HANA during go-live |
| ⚙️ | **Enhancement (E)** | Change SAP behavior | Custom validations, new fields, approval workflows |
| 📄 | **Form (F)** | Generate documents | Invoices, purchase orders, shipping notices |
| 🔔 | **Workflow (W)** | Approval processes | Purchase order approval, expense claim routing |

**Pick one based on what you're building.**

#### Step 2: Provide Details
Fill in:
- **RICEFW ID** - Auto-generated or enter manually (format: like "R-0042-IMP")
- **Object Name** - Specific name (e.g., "Sales Order Daily Report")
- **Description** - 2-3 sentences about what this does
- **Business Area** - Which SAP module? (Finance, Supply Chain, etc.) - Optional

Click **"Continue"**

---

### Phase 3: Answer the Wizard Questions

#### What You'll See
The wizard guides you one step at a time. Here is what the screen looks like:

```text
+---------------------------------------------------------------+
|  Clean Core Solution Advisor                   [User Profile] |
+---------------------------------------------------------------+
|  < Back   Analysis: Sales Order Report (R-0042)      Step 2/5 |
+---------------------------------------------------------------+
|                                                               |
|  QUESTION:                                                    |
|  **How frequently will this report be accessed?**             |
|                                                               |
|  [?] View Hint   [i] See Example                              |
|                                                               |
|  ( ) Real-time (On demand by users)                           |
|  (o) Daily (Scheduled batch job)                              |
|  ( ) Monthly / Quarterly                                      |
|                                                               |
|  -----------------------------------------------------------  |
|  Constraint Check:                                            |
|  [INFO] Daily reports are compatible with S/4HANA Cloud       |
|                                                               |
+---------------------------------------------------------------+
|                    [ Previous ]   [ Next > ]                  |
+---------------------------------------------------------------+
```

- **One question per screen**
- **Multiple choice answers** - Pick the most relevant
- **Hints for each question** - Click "?" for explanation
- **Examples** - Real scenarios shown as help
- **Progress bar** - See how many questions remain

#### Understanding the Questions

The wizard asks about:

1. **Scope & Complexity**
   - Is this report simple or complex?
   - How many records will it process?
   - How many users will use it?

2. **Technical Requirements**
   - Do you need real-time data or is daily OK?
   - Is this a user-facing report or backend process?
   - Does external system need to integrate?

3. **Cloud Compatibility**
   - Must this work on public cloud?
   - Are there data residency requirements?
   - Is this for SAP Cloud or On-Premise?

4. **Existing SAP Features**
   - Does SAP already have a standard solution?
   - Can you use released APIs?
   - Are standard forms available?

#### How to Answer
- **Choose the option that BEST matches your requirement**
- If unsure, click **"View Example"** to see similar cases
- Read the hints to understand why each option matters
- Don't overthink - there's no "wrong" answer

#### Pro Tips While Answering
- ✅ **Be honest** - Answer based on actual requirement, not wishful thinking
- ✅ **Ask the business** - "How many users?" "Real-time or daily?" etc.
- ✅ **Think constraints** - Remember your S/4HANA flavor (Cloud, On-Premise, etc.)
- ✅ **Watch for red flags** - Some answers might trigger constraints

---

### Phase 4: Review Your Recommendation

#### What You Get
After answering all questions, the tool shows a summary dashboard:

```text
+---------------------------------------------------------------+
|  Analysis Result: Sales Order Report (R-0042)      [Export]   |
+---------------------------------------------------------------+
|  RECOMMENDATION:                                              |
|  [ LEVEL A ]  Clean Core Compliant                            |
|  "Use SAP Standard Fiori App with In-App Extensibility"       |
+---------------------------------------------------------------+
|  SCORES:                                                      |
|  Technical Debt:   [==........]  15/100 (Low)                 |
|  Cloud Readiness:  [=========.]  95%    (High)                |
|  Upgrade Impact:   [=.........]  10/100 (Low)                 |
+---------------------------------------------------------------+
|  CONSTRAINTS & GUIDANCE:                                      |
|  [V] Allowed: Use released OData APIs                         |
|  [V] Allowed: Create Fiori app with extensions                |
|  [X] Not Allowed: Custom ABAP in public cloud                 |
|  [X] Not Allowed: Direct database access                      |
+---------------------------------------------------------------+
|  REASONING:                                                   |
|  "Based on your selection of 'Daily' frequency and 'Standard  |
|   Data', a standard Fiori app is sufficient."                 |
+---------------------------------------------------------------+
```

**1. Clean Core Level (A/B/C/D)**
```
🟩 LEVEL A - Cleanest (Gold Standard)
Use SAP standard features only
- No custom code needed
- Zero technical debt
- Perfect upgrade safety
- Fastest implementation
```

**2. Your Scores** (See next section for details)
- Technical Debt Score: 15/100 (Lower = Better)
- Cloud Readiness: 95% (Higher = Better)
- Upgrade Impact: 10/100 (Lower = Better)

**3. Constraints** (What's allowed/not allowed)
Example:
```
✅ ALLOWED:
- Use released OData APIs
- Create Fiori app with extensions
- Scheduled jobs via Job Scheduler

❌ NOT ALLOWED:
- Custom ABAP in public cloud
- Direct database access
- File-based integration
```

**4. Real-World Example**
"Similar company faced same requirement. They used [approach], took [X weeks], scored [Y] on technical debt."

**5. Your Decision Path**
Shows which questions led to which recommendation (for audit trail).

---

## Understanding the Results

### What Do These Scores Mean?

#### 1. Technical Debt Score (0-100, Lower is Better)
**What it is:** How much "maintenance burden" your solution creates.

| Score | Status | Meaning |
|-------|--------|---------|
| 0-25 | ✅ Low | Will be easy to maintain; clean code |
| 26-50 | ⚠️ Medium | Some custom code; manageable |
| 51-75 | ⚠️ High | Significant custom code; needs management |
| 76-100 | ❌ Critical | Heavy custom code; expensive maintenance |

**Example:**
- Level A (using SAP standard): Score = 0 (no debt, no maintenance)
- Level C (with custom code): Score = 60 (significant effort to maintain)
- Level D (deep modifications): Score = 95 (will require constant updates)

**Use it for:** Estimating long-term maintenance effort and budget

---

#### 2. Cloud Readiness Score (0-100%, Higher is Better)
**What it is:** Can this solution run on SAP Cloud?

| Score | Readiness | Meaning |
|-------|-----------|---------|
| 85-100% | ✅ Ready | Works perfectly on S/4HANA Cloud |
| 65-84% | ⚠️ Mostly Ready | Minor adjustments needed for cloud |
| 45-64% | ⚠️ Partial | Significant changes needed; possible but complex |
| 0-44% | ❌ Not Ready | Won't work on cloud; on-premise only |

**Example:**
- Level A using released APIs: 100% (cloud native)
- Level B using extensions: 85% (cloud compatible)
- Level C with custom ABAP: 30% (not cloud compatible)

**Use it for:** Strategic planning (should this work on cloud in future?)

---

#### 3. Upgrade Impact Score (0-100, Lower is Better)
**What it is:** What will happen when SAP upgrades to new version?

| Score | Impact | Meaning |
|-------|--------|---------|
| 0-25 | ✅ Low | Will survive SAP upgrades; no changes needed |
| 26-50 | ⚠️ Medium | Minor fixes needed after upgrade |
| 51-75 | ⚠️ High | Significant rework needed; affects timeline |
| 76-100 | ❌ Critical | Likely to break; expensive remediation |

**Example:**
- Level A using standards: Score = 0 (upgrades are painless)
- Level B using extensibility: Score = 15 (minor tweaks)
- Level C with custom code: Score = 70 (big rework needed)
- Level D (deep modifications): Score = 95 (very risky)

**Use it for:** Planning upgrade projects; identifying risky areas

---

#### 4. What is Each Level? (A/B/C/D)

**🟩 Level A - Cleanest (Gold Standard)**
- Uses SAP standard features only
- No custom code
- Fastest to implement
- Safest for upgrades
- Can run on any cloud
- Best long-term TCO
- **Effort:** 1-2 weeks typical

**🟦 Level B - Classic but Acceptable**
- Uses SAP released APIs and extensions
- Modern, cloud-ready approach
- Moderate implementation effort
- Safe during upgrades
- Professional, future-proof
- **Effort:** 2-4 weeks typical

**🟨 Level C - Risky Legacy**
- Custom code but documented and managed
- Works on on-premise only
- High maintenance burden
- Risky during upgrades
- Expensive long-term
- **Effort:** 4-8 weeks typical

**🟥 Level D - Do Not Do This (Modifications)**
- Deep modifications to SAP code
- Very risky
- Will break on upgrades
- Not supported by SAP
- Extremely expensive long-term
- **AVOID unless absolutely necessary**
- **Effort:** 8+ weeks (plus future rework)

---

### How To Use This Information

**In Your Estimation Document:**
- Include scores and explain what they mean
- Show impact on upgrade projects
- Highlight if cloud readiness is below 70%

**In Your Functional Specification:**
- Reference the recommendation and constraints
- Copy example scenarios (show you researched options)
- Explain why this level was chosen over alternatives

**In Your Technical Design:**
- Ensure TDD follows exactly the recommended approach
- If deviating, document why and impact on scores
- Call out any constraints that must be adhered to

---

## Managing Your Projects

### View All Your Analyses
1. Click **"My Analyses"** from home screen
2. See list of all analyses you've created:
   - **Analysis Name** - The RICEFW object
   - **Project** - Which project it belongs to
   - **Status** - Completed, In Progress, etc.
   - **Level** - Recommended clean core level (A/B/C/D)
   - **Created Date** - When you ran the wizard
3. Click any analysis to **view details** or **edit**

### Edit an Existing Analysis
1. Open the analysis from the list
2. Click **"Edit"** button
3. Modify any fields (but wizard questions are locked)
4. Review scores again
5. Click **"Save"**

### Export Analysis
1. Open the analysis
2. Click **"Export as PDF"** or **"Download as Excel"**
3. Get a document with:
   - All scores and metrics
   - Decision path
   - Constraints
   - Recommendation with justification
   - Real-world examples

### View Project Analytics (Optional)
1. From home, click **"Analytics"**
2. See organization-wide insights:
   - How many Level A vs. Level C solutions?
   - Average technical debt across project
   - Cloud readiness trend
   - Upgrade risk summary
3. Use this to identify risky areas for escalation

---

## Tips & Best Practices

### ✅ DO:
1. **Run the wizard early** - Right after creating RICEFW ID, before detailed design
2. **Be specific in answers** - "Daily with 5 million records" not "lots of data"
3. **Include scores in FS** - Copy recommendation and scores into Functional Spec
4. **Ask hints** - Click "?" if unsure about a question
5. **Use examples** - The real-world cases show proven patterns
6. **Escalate Level D** - If recommendation is Level D, talk to architect immediately
7. **Revisit if scope changes** - If requirement materially changes, re-run wizard
8. **Track for audit** - Keep analysis records for governance reviews

### ❌ DON'T:
1. **Ignore constraints** - If tool says cloud doesn't support it, don't try to force it
2. **Override Level D alone** - Always get architecture approval before using Level D
3. **Assume you know better** - The tool is trained on SAP best practices
4. **Wait until TDD** - Run wizard early; don't discover issues later
5. **Ignore scores** - Low scores indicate future pain; take them seriously
6. **Make decisions without team** - Discuss recommendation with technical lead first

### When Technical Debt Score Is High:
1. **Check constraints** - Are there allowed alternatives?
2. **Ask "why Level C?"** - What about the requirement forced this?
3. **Consider Level B** - Can you use APIs or extensions instead?
4. **Plan remediation** - If must use Level C, plan future migration to Level B
5. **Increase buffer** - Add 20% extra time for future maintenance

### When Cloud Readiness Is Low:
1. **Clarify strategy** - Will this ever move to cloud?
2. **If yes:** Re-run wizard with Level B options
3. **If no:** Document "on-premise forever" as assumption
4. **Future-proof:** Consider Level B even if cloud not planned soon

---

## Troubleshooting

### "I Don't Know How to Answer a Question"

**Solution:**
1. Click the **"View Hint"** button under the question
2. Read the explanation of why this matters
3. Click **"See Example"** to see a similar real case
4. If still unsure, discuss with your technical lead
5. Pick the closest match and continue

**Common Questions:**
- **"How many users?"** - Ask your business owner
- **"Real-time or daily?"** - Check with end-user department
- **"On public cloud?"** - Check your project governance
- **"API available?"** - Ask your technical team or SAP Architect

---

### "The Recommendation Doesn't Match My Expectation"

**Why it happened:**
- You may have selected options differently than expected
- The tool is applying clean core principles strictly
- There may be constraints you didn't know about

**What to do:**
1. **Review your answers** - Click "View Decision Path" to see which questions led to the recommendation
2. **Re-read constraints** - Is something not allowed in your setup?
3. **Ask for help** - Show the recommendation to your technical lead
4. **Understand the "why"** - Read the reasoning section
5. **If truly incorrect** - Contact your admin to update master data

---

### "I Can't Find My Project"

**Solution:**
1. Check spelling - Is the project name exact?
2. Verify you have access - Ask your project admin to add you
3. Create new project - If it doesn't exist yet, create it first
4. Check tenant - Are you in the right tenant/organization?

---

### "The Application Is Slow"

**Solution:**
1. **Refresh the page** - F5 or Ctrl+Shift+R
2. **Check internet** - Make sure you have stable connection
3. **Try again later** - Server may be busy; try in few minutes
4. **Contact admin** - If problem persists, report to your IT team

---

### "I Need to Change My Answer"

**Solution:**
1. Click **"Edit Analysis"** button
2. You cannot change previous answers (locked for audit)
3. Option A: **Create new analysis** with correct answers
4. Option B: **Contact your admin** if you need special permission to modify
5. Add a note explaining why you're creating a new analysis

---

## When To Escalate to Your Technical Lead

**Escalate immediately if:**
1. ✋ Recommendation is Level D
2. ✋ Tool shows "Not Allowed" constraint that you don't understand
3. ✋ You need to override the recommendation
4. ✋ The scores seem wrong for your requirement
5. ✋ You have special compliance requirements not in the system

**Escalate at design review if:**
1. ✓ Technical Debt Score > 60
2. ✓ Cloud Readiness < 70% (if cloud is strategic)
3. ✓ Upgrade Impact > 50 (risky for future upgrades)

---

## Quick Reference: When to Run This Tool

| Phase | Activity | Run Tool? | Why? |
|-------|----------|-----------|------|
| **RTM** | Gathering requirements | ✅ After RICEFW created | Get early decision |
| **RICEFW** | Track requirement | ✅ Immediately | Baseline recommendation |
| **Estimation** | Size the work | ✅ Use scores | Better estimates |
| **RDD** | Detailed design | ⚠️ Only if scope changed | Validate approach still valid |
| **FS** | Functional spec | ⚠️ Reference only | Quote constraints, examples |
| **TDD** | Technical spec | ❌ Reference only | TDD should align to FS |
| **Development** | Build code | ❌ Reference only | Follow constraint rules |

---

## Summary

**You now know:**
- ✅ What this tool does and when to use it
- ✅ How to create projects and run analyses
- ✅ What the scores mean and how to interpret them
- ✅ When to escalate to technical teams
- ✅ How to use results in your documents

**Next Step:** Go to home screen and click "New Analysis" to try it!

---

**Questions or Issues?**  
Contact your Project Admin or SAP Architect for additional support.
