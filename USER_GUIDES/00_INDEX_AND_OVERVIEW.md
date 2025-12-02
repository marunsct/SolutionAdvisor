# Clean Core Solution Advisor - User Guide Index
## Complete Documentation Overview

**Updated:** December 2025

---

## 📚 Available User Guides

### 1. **01_FUNCTIONAL_CONSULTANT_GUIDE.md**
**For:** Analysts, Consultants, Business Users  
**Read Time:** 15-20 minutes  
**Focus:** How to use the tool day-to-day

**What You'll Learn:**
- What the tool does and why you need it
- Step-by-step wizard walkthrough (5 phases)
- How to interpret 4 scoring metrics
- How to understand Level A/B/C/D recommendations
- How to manage and export analyses
- Troubleshooting common issues
- When to escalate to technical leads

**Key Sections:**
- Getting Started (10 min)
- Creating Your First Analysis (5 min)
- Understanding Your Results (5 min)
- Tips, Best Practices & Troubleshooting (5 min)

---

### 2. **02_SOLUTION_ARCHITECT_GUIDE.md**
**For:** Solution Architects, Technical Leads, Architecture Review Board  
**Read Time:** 20-30 minutes  
**Focus:** Technical decision-making and governance

**What You'll Learn:**
- Technical architecture of the system
- How the decision engine works (JSON navigation rules)
- How scoring calculates technical debt, cloud readiness, upgrade impact
- How to use scores for governance gates
- How to integrate into design workflow
- How to handle exceptions and escalations
- How to optimize decision outcomes

**Key Sections:**
- Decision Engine Deep Dive (10 min)
- Scoring System & Formulas (10 min)
- Governance & Quality Gates (5 min)
- Advanced Features & Troubleshooting (5 min)

---

### 3. **03_PROJECT_MANAGER_GUIDE.md**
**For:** Project Managers, Program Directors, PMO Teams  
**Read Time:** 20-30 minutes  
**Focus:** Project tracking and risk management

**What You'll Learn:**
- When to integrate tool into project schedule
- How to use portfolio health dashboard
- How to manage technical debt as project metric
- How to forecast schedule impact (Level A vs C vs D)
- How to track and escalate risks
- How to report to steering committee
- Common project challenges and solutions

**Key Sections:**
- Project Integration Timeline (5 min)
- Portfolio Health Dashboard (5 min)
- Technical Debt Management (5 min)
- Effort & Schedule Impact (10 min)
- Risk Tracking & Reporting (5 min)

---

### 4. **04_ADMIN_GUIDE.md**
**For:** System Administrators, Database Administrators, Technical Support  
**Read Time:** 40-50 minutes  
**Focus:** System setup, maintenance, and troubleshooting

**What You'll Learn:**
- How the decision engine navigates questions (detailed code examples)
- How scoring service calculates metrics (formulas with examples)
- How to create seed data (CSV step-by-step with templates)
- CSV file format and validation
- Role-based access control (RBAC) matrix
- System maintenance, backups, disaster recovery
- Common troubleshooting scenarios
- Performance tuning and indexing

**Key Sections:**
- Admin Overview (5 min)
- Decision Engine & Scoring Deep Dive (20 min)
- Master Data Architecture (5 min)
- Creating Seed Data (Step-by-Step) (15 min)
- Role Management (5 min)
- Troubleshooting & Performance (5 min)

---

## 🎯 Quick Reference: Which Guide Do I Need?

| Question | Guide | Section |
|----------|-------|---------|
| How do I run an analysis? | Functional Consultant | "Step-by-Step Analysis Creation" |
| What does my score mean? | Functional Consultant | "Understanding Results" |
| How does the wizard navigation work? | Solution Architect / Admin | "Decision Engine Deep Dive" |
| How are scores calculated? | Solution Architect / Admin | "Scoring System" |
| When should I use this tool in my project? | Project Manager | "Project Integration Timeline" |
| How do I forecast schedule impact? | Project Manager | "Effort & Schedule Impact" |
| How do I track technical debt? | Project Manager | "Technical Debt Management" |
| How do I create seed data? | Admin | "Creating Seed Data" |
| What are the role permissions? | Admin | "Role Management" |
| Why isn't my question loading? | Admin | "Troubleshooting" |
| How do I backup the database? | Admin | "System Maintenance" |

---

## 📖 Reading Paths by Role

### Path 1: First-Time User (Any Role)
1. Start: "01_FUNCTIONAL_CONSULTANT_GUIDE" → "What is This Application?" (5 min)
2. Then: "How to Get Started" (5 min)
3. If in project team: Read "Project Manager Guide" → "Project Integration Timeline" (5 min)
4. If architect/technical lead: Read "Solution Architect Guide" → "Technical Architecture Overview" (5 min)

**Total Time:** 15-20 minutes

---

### Path 2: Functional Consultant/Analyst
1. Read complete: "01_FUNCTIONAL_CONSULTANT_GUIDE.md" (15-20 min)
2. Reference: Use "Troubleshooting & When to Escalate" sections as needed
3. Deep dive (optional): "Solution Architect Guide" → "Understanding the Scoring System" (10 min)

**Total Time:** 15-30 minutes

---

### Path 3: Solution Architect/Technical Lead
1. Read complete: "02_SOLUTION_ARCHITECT_GUIDE.md" (20-30 min)
2. Reference: Use "Troubleshooting & Escalations" section as needed
3. Deep dive: "04_ADMIN_GUIDE.md" → "Decision Engine Deep Dive" (10 min)
4. Reference guide: Keep "Governance & Quality Gates" handy for reviews

**Total Time:** 30-40 minutes

---

### Path 4: Project Manager/PMO
1. Read complete: "03_PROJECT_MANAGER_GUIDE.md" (20-30 min)
2. Reference: Use "Risk Tracking" section for weekly status
3. Deep dive (optional): "01_FUNCTIONAL_CONSULTANT_GUIDE.md" → "How to Get Started" (5 min)

**Total Time:** 20-35 minutes

---

### Path 5: System Administrator
1. Read complete: "04_ADMIN_GUIDE.md" (40-50 min)
   - Recommended: Print "Master Data Architecture" section
2. Setup: Follow "Creating Seed Data (Step-by-Step)" for initial data load
3. Reference: Keep "Troubleshooting & Performance Tuning" sections bookmarked

**Total Time:** 40-60 minutes (first time); 5-10 min for reference lookups

---

## 🔧 Common Tasks & Where to Find Help

### Running Your First Analysis
**Guide:** Functional Consultant Guide  
**Sections:** "How to Get Started" + "Step-by-Step Analysis Creation"  
**Time:** 10 minutes

---

### Understanding Your Scores
**Guide:** Functional Consultant Guide  
**Section:** "Understanding Results"  
**Detailed Info:** Solution Architect Guide → "Understanding the Scoring System"  
**Time:** 5-10 minutes

---

### Planning Project Schedule
**Guide:** Project Manager Guide  
**Sections:** "Project Integration Timeline" + "Effort & Schedule Impact"  
**Time:** 15 minutes

---

### Managing Technical Debt
**Guide:** Project Manager Guide  
**Section:** "Technical Debt Management"  
**Time:** 10 minutes

---

### Creating Seed Data
**Guide:** Admin Guide  
**Section:** "Creating Seed Data (Step-by-Step)"  
**Time:** 30-40 minutes

---

### Troubleshooting Issues
**Guide:** Admin Guide  
**Section:** "Troubleshooting for Admins"  
**Time:** 5-10 minutes (per issue)

---

## 📊 Guide Size & Complexity

| Guide | Pages | Sections | Code Examples | Tables |
|-------|-------|----------|----------------|--------|
| Functional Consultant | ~8 | 12 | 0 | 8 |
| Solution Architect | ~12 | 10 | 4 | 6 |
| Project Manager | ~10 | 9 | 1 | 5 |
| Admin | ~20 | 10 | 10 | 8 |
| **TOTAL** | **~50** | **41** | **15** | **27** |

---

## 🎓 Learning Objectives by Role

### Functional Consultant
After reading the guide, you should be able to:
- ✅ Describe what the tool does in simple terms
- ✅ Execute a complete wizard analysis independently
- ✅ Interpret 4 scoring metrics accurately
- ✅ Identify when to escalate to technical leads
- ✅ Export and share results with stakeholders

---

### Solution Architect
After reading the guide, you should be able to:
- ✅ Explain how the decision engine navigates questions
- ✅ Calculate scoring metrics manually (verify correctness)
- ✅ Design governance gates using tool outputs
- ✅ Handle exceptions and escalations appropriately
- ✅ Integrate tool into design workflow
- ✅ Troubleshoot technical issues with scoring or navigation

---

### Project Manager
After reading the guide, you should be able to:
- ✅ Integrate tool into project schedule (timeline)
- ✅ Interpret portfolio health dashboard metrics
- ✅ Forecast schedule impact based on Level A/B/C/D mix
- ✅ Track technical debt as project metric
- ✅ Identify and escalate risks appropriately
- ✅ Report clean core health to steering committee

---

### System Administrator
After reading the guide, you should be able to:
- ✅ Explain decision engine architecture and navigation logic
- ✅ Configure scoring multipliers for organizational policy
- ✅ Create and validate seed data (CSV files)
- ✅ Manage roles and access control appropriately
- ✅ Perform system maintenance (backups, upgrades)
- ✅ Troubleshoot common issues
- ✅ Tune system performance

---

## 📞 Support & Escalation

### For Usage Questions
**First Contact:** Functional Consultant Guide or Solution Architect Guide  
**If Not Resolved:** Contact your Technical Lead or Solution Architect

---

### For Technical Issues
**First Contact:** Admin Guide → "Troubleshooting for Admins"  
**If Not Resolved:** Contact System Administrator or technical support team

---

### For Process/Governance Questions
**First Contact:** Project Manager Guide or Solution Architect Guide  
**If Not Resolved:** Escalate to CTO or Architecture Board

---

## 📋 Maintenance & Updates

**Guide Version:** 1.0  
**Last Updated:** December 2, 2025  
**Next Review:** Q1 2026

**Known Limitations:**
- Guides assume 100 RICEFW portfolio (adjust numbers for smaller/larger)
- Cloud flavor options assume public/private/on-premise (adjust as needed)
- Scoring multipliers are illustrative (verify with your organization)

**To Report Issues or Suggest Improvements:**
- Email: [contact your admin team]
- Include: Which guide, which section, what's unclear
- Response time: 2-3 business days

---

## 📚 Document Structure

Each guide follows a consistent structure:

1. **Purpose & Audience** (Who should read this)
2. **Table of Contents** (Navigate to relevant section)
3. **Main Content** (Detailed information with examples)
4. **Quick Reference Table** (Fast lookup for common questions)
5. **Summary** (Key takeaways)
6. **Next Steps** (What to do next)

---

## 🔗 Cross-References

| Concept | Explained In | Detailed In |
|---------|-------------|------------|
| Score Interpretation | FC Guide | SA Guide, Admin Guide |
| Decision Engine | SA Guide | Admin Guide |
| Scoring Formulas | SA Guide | Admin Guide |
| Governance Gates | SA Guide | PM Guide |
| Technical Debt | PM Guide | SA Guide, Admin Guide |
| Role Management | Admin Guide | SA Guide |
| CSV Format | Admin Guide | (FC/SA/PM don't need) |
| Troubleshooting | All guides | Admin Guide (detailed) |

---

## 💡 Tips for Using These Guides

1. **Print or Bookmark:** Save a copy for offline reference
2. **Search:** Use Ctrl+F to find specific topics quickly
3. **Share:** Share relevant guide with your team members
4. **Reference:** Keep "Quick Reference" sections handy during work
5. **Update:** Check back periodically for updates
6. **Feedback:** Let us know if sections are unclear

---

**Ready to Get Started?**

Choose your role and jump to the appropriate guide:
- 🔵 [Functional Consultant](01_FUNCTIONAL_CONSULTANT_GUIDE.md)
- 🟣 [Solution Architect](02_SOLUTION_ARCHITECT_GUIDE.md)
- 🟢 [Project Manager](03_PROJECT_MANAGER_GUIDE.md)
- 🟠 [Administrator](04_ADMIN_GUIDE.md)

