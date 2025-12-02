# User Guides - Clean Core Solution Advisor
## Complete Documentation Suite

**Version:** 1.0  
**Date:** December 2025  
**Status:** Ready for Use

---

## 📚 What's In This Folder

This folder contains **complete user documentation** for the Clean Core Solution Advisor application, organized by user role and use case.

**5 Documents | 50+ Pages | 40+ Sections | 25+ Tables**

---

## 📄 Document Descriptions

### 1. **00_INDEX_AND_OVERVIEW.md** (Start Here!)
**Purpose:** Navigation guide for all users  
**Length:** 4 pages

**Contains:**
- List of all available guides
- Quick reference for "which guide do I need?"
- Reading paths by role
- Learning objectives
- Support and escalation information

**When to Read:** First, when you're new to the tool or need to find specific information

---

### 2. **01_FUNCTIONAL_CONSULTANT_GUIDE.md**
**Purpose:** Day-to-day user guide for analysts and business consultants  
**Length:** 8 pages  
**Audience:** Functional Consultants, Business Analysts, Project Consultants

**Contains:**
- What the tool is and how to use it (simple language)
- Step-by-step walkthrough of running an analysis (5 phases)
- How to understand 4 scoring metrics (with interpretation tables)
- How to understand Level A/B/C/D recommendations
- How to manage and export analyses
- Tips, best practices, and anti-patterns
- Troubleshooting common issues
- When to escalate to technical leads
- Quick reference table for different project phases

**Read Time:** 15-20 minutes

**Key Sections:**
- Getting Started (how to access, what you see)
- Phase 1-5 Walkthrough (project creation through results review)
- Understanding Results (all 4 scores explained)
- Tips & Best Practices (DO's and DON'Ts)
- Troubleshooting (common issues and solutions)

---

### 3. **02_SOLUTION_ARCHITECT_GUIDE.md**
**Purpose:** Technical decision-making and governance guide for architects  
**Length:** 12 pages  
**Audience:** Solution Architects, Technical Leads, Architecture Review Board, CTO

**Contains:**
- Technical architecture overview (data flow diagram)
- Decision engine deep dive (how questions navigate; JSON rules)
- Scoring service explained (4 formulas with calculations)
- Governance and quality gates (approval workflows)
- Advanced features (portfolio analytics, audit logging)
- Integration with design and development workflow
- Performance and optimization considerations
- Troubleshooting and escalation scenarios
- Quick decision guide for architects

**Read Time:** 20-30 minutes

**Key Sections:**
- Technical Architecture (with diagram)
- Decision Engine Deep Dive (code flow + examples)
- Understanding the Scoring System (formulas + calculations)
- Governance & Quality Gates (approval workflows)
- Troubleshooting & Escalations (common scenarios)

---

### 4. **03_PROJECT_MANAGER_GUIDE.md**
**Purpose:** Project tracking and risk management guide for project leads  
**Length:** 10 pages  
**Audience:** Project Managers, Program Directors, PMO Teams, Project Controllers

**Contains:**
- Why the tool matters for projects (business impact)
- Project integration timeline (when to use, by phase)
- Portfolio health dashboard (metrics explained)
- Technical debt management (tracking, remediation)
- Risk tracking and escalations (what to watch for)
- Effort and schedule impact (how decisions affect timeline)
- Project metrics and reporting (dashboards, templates)
- Governance integration (steering committee reviews)
- Common project challenges (and solutions)

**Read Time:** 20-30 minutes

**Key Sections:**
- Project Integration Timeline (phase-by-phase)
- Portfolio Health Dashboard (metrics & interpretation)
- Technical Debt Management (tracking & trends)
- Effort & Schedule Impact (estimation formula)
- Risk Tracking & Escalations (decision matrix)
- Common Project Challenges (troubleshooting)

---

### 5. **04_ADMIN_GUIDE.md**
**Purpose:** System administration and technical support guide  
**Length:** 20 pages  
**Audience:** System Administrators, Database Administrators, Technical Support, Master Data Stewards

**Contains:**
- Admin overview (responsibilities, entities)
- Decision engine deep dive (detailed code flow, error handling)
- Scoring service explained (formulas, configuration, multiplier adjustment)
- Master data architecture (all entities, relationships)
- Creating seed data (CSV step-by-step with templates and examples)
- CSV file format and validation (rules, common errors, validation script)
- Role management and access control (RBAC matrix, assigning roles)
- System maintenance (backups, recovery, monitoring)
- Troubleshooting for admins (common issues with solutions)
- Performance tuning (indexes, caching, query optimization)

**Read Time:** 40-50 minutes

**Key Sections:**
- Decision Engine Deep Dive (pseudo-code + JSON examples)
- Scoring Service Explained (formulas + examples)
- Master Data Architecture (ER relationships)
- Creating Seed Data (step-by-step for each entity)
- CSV File Format (validation rules + error handling)
- Troubleshooting (diagnostic steps + fixes)

---

### 6. **05_QUICK_REFERENCE_CARD.md**
**Purpose:** One-page reference for common tasks (print-friendly)  
**Length:** 4 pages  
**Audience:** All users (quick lookup)

**Contains:**
- 5-step quick guide per role (Consultant, Architect, PM, Admin)
- Score interpretation table
- Level quick guide (A/B/C/D at a glance)
- When to escalate (checklist)
- Governance decision matrix
- Effort estimation formula
- Technical debt escalation criteria
- Role permissions matrix (simplified)
- Common issues & quick fixes
- Cross-role decision example
- System specifications

**Read Time:** 5-10 minutes (or keep handy for reference)

**Key Uses:**
- Print and post by your desk
- Share with team members during meetings
- Quick lookup during analysis/review
- Training reference for new users

---

## 🎯 How to Use These Guides

### For New Users
1. Start with: **00_INDEX_AND_OVERVIEW.md** (2 min)
2. Then read: Your role-specific guide (15-30 min)
3. Keep handy: **05_QUICK_REFERENCE_CARD.md** (print it!)

### For Specific Tasks
Use the "Quick Reference: Which Guide Do I Need?" table in **00_INDEX_AND_OVERVIEW.md** to find the right section quickly.

### For Training
- New Consultants: Use **01_FUNCTIONAL_CONSULTANT_GUIDE.md** + **05_QUICK_REFERENCE_CARD.md**
- New Architects: Use **02_SOLUTION_ARCHITECT_GUIDE.md** + **05_QUICK_REFERENCE_CARD.md**
- New Admins: Use **04_ADMIN_GUIDE.md** (all sections, in order)

### For Reference
- Troubleshooting: Go to your role guide → "Troubleshooting" section, OR **04_ADMIN_GUIDE.md** → "Troubleshooting for Admins"
- Governance: **02_SOLUTION_ARCHITECT_GUIDE.md** → "Governance & Quality Gates"
- Project Planning: **03_PROJECT_MANAGER_GUIDE.md** → "Project Integration Timeline"
- Data Setup: **04_ADMIN_GUIDE.md** → "Creating Seed Data"

---

## 📖 Reading Paths

### Path 1: "I Want to Use the Tool Today" (30 min)
1. **00_INDEX_AND_OVERVIEW.md** → "Which Guide Do I Need?" (find your role)
2. Your role guide → "Getting Started" or "Overview" section
3. Your role guide → relevant main section
4. **05_QUICK_REFERENCE_CARD.md** → your role's section (keep for later reference)

---

### Path 2: "I Need to Set Up the System" (2 hours)
1. **04_ADMIN_GUIDE.md** → "Admin Overview" (understand components)
2. **04_ADMIN_GUIDE.md** → "Master Data Architecture" (understand entities)
3. **04_ADMIN_GUIDE.md** → "Creating Seed Data (Step-by-Step)" (follow steps)
4. **04_ADMIN_GUIDE.md** → "CSV File Format & Validation" (validate your data)
5. **05_QUICK_REFERENCE_CARD.md** → "For System Administrators" (keep for reference)

---

### Path 3: "I Need to Understand How Scoring Works" (45 min)
1. **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → "Understanding Results" (basic)
2. **02_SOLUTION_ARCHITECT_GUIDE.md** → "Understanding the Scoring System" (detailed)
3. **04_ADMIN_GUIDE.md** → "Scoring Service Explained" (technical)
4. **05_QUICK_REFERENCE_CARD.md** → "Scoring Formulas" (quick reference)

---

### Path 4: "I Need to Plan & Report on the Project" (1 hour)
1. **03_PROJECT_MANAGER_GUIDE.md** → "Project Integration Timeline"
2. **03_PROJECT_MANAGER_GUIDE.md** → "Portfolio Health Dashboard"
3. **03_PROJECT_MANAGER_GUIDE.md** → "Effort & Schedule Impact"
4. **05_QUICK_REFERENCE_CARD.md** → "For Project Managers"
5. Use **03_PROJECT_MANAGER_GUIDE.md** → "Project Metrics & Reporting" for templates

---

## 🔍 Quick Lookup Table

| Topic | Guide | Section |
|-------|-------|---------|
| Getting Started | FC | "Getting Started" |
| Running Analysis | FC | "Step-by-Step Analysis Creation" |
| Understanding Scores | FC / SA | FC: "Understanding Results" / SA: "Scoring System" |
| Level A/B/C/D Guide | FC / QRC | FC: "Understanding Results" / QRC: "Level Quick Guide" |
| When to Escalate | FC / SA / QRC | FC: "When to Escalate" / QRC: "When to Escalate" |
| Decision Engine Logic | SA / Admin | SA: "Decision Engine" / Admin: "Decision Engine Deep Dive" |
| Scoring Formulas | SA / Admin / QRC | SA: "Formulas" / Admin: "Formulas" / QRC: "Formulas" |
| Governance Gates | SA / PM | SA: "Governance" / PM: "Project Integration" |
| Project Planning | PM | "Project Integration Timeline" |
| Effort Estimation | PM / QRC | PM: "Effort & Schedule" / QRC: "Formula" |
| Technical Debt | PM | "Technical Debt Management" |
| Create Seed Data | Admin | "Creating Seed Data (Step-by-Step)" |
| CSV Format | Admin | "CSV File Format & Validation" |
| Role Management | Admin / QRC | Admin: "Role Management" / QRC: "Permissions Matrix" |
| Troubleshooting | [Your Role] | Each guide has "Troubleshooting" section |
| Quick Reference | QRC | All sections |

---

## 📊 Guide Statistics

| Guide | Pages | Main Sections | Tables | Code Examples | Estimated Read Time |
|-------|-------|---------------|--------|----------------|---------------------|
| Index & Overview | 4 | 8 | 3 | 0 | 5-10 min |
| Functional Consultant | 8 | 12 | 8 | 0 | 15-20 min |
| Solution Architect | 12 | 10 | 6 | 4 | 20-30 min |
| Project Manager | 10 | 9 | 5 | 1 | 20-30 min |
| Admin | 20 | 10 | 8 | 10 | 40-50 min |
| Quick Reference | 4 | 12 | 12 | 2 | 5-10 min |
| **TOTAL** | **58** | **61** | **42** | **17** | **Varies** |

---

## 💡 Best Practices

### For Consultants
- ✅ Print **05_QUICK_REFERENCE_CARD.md** and post it by your desk
- ✅ Use **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → "Tips & Best Practices"
- ✅ Bookmark **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → "Troubleshooting" section

### For Architects
- ✅ Read **02_SOLUTION_ARCHITECT_GUIDE.md** before first gate review
- ✅ Print **02_SOLUTION_ARCHITECT_GUIDE.md** → "Governance Decision Matrix"
- ✅ Reference **04_ADMIN_GUIDE.md** → "Decision Engine Deep Dive" for technical questions

### For Project Managers
- ✅ Use **03_PROJECT_MANAGER_GUIDE.md** → "Project Integration Timeline" for project charter
- ✅ Print **05_QUICK_REFERENCE_CARD.md** → "Effort Estimation Formula"
- ✅ Use **03_PROJECT_MANAGER_GUIDE.md** → "Project Metrics & Reporting" for steering slides

### For Admins
- ✅ Print all sections of **04_ADMIN_GUIDE.md** and create binder
- ✅ Bookmark **04_ADMIN_GUIDE.md** → "Creating Seed Data" for data migration
- ✅ Keep **04_ADMIN_GUIDE.md** → "Troubleshooting" open during support calls

---

## 🔧 Document Maintenance

### Version History
- **1.0** (Dec 2, 2025): Initial release

### Known Limitations
- Guides assume 100-RICEFW portfolio (scale numbers as needed)
- Cloud flavors: Public/Private/On-Premise (customize if different)
- Scoring multipliers: Illustrative (verify with your organization policy)

### Future Updates
- Q1 2026: Incorporate user feedback and real-world examples
- Q2 2026: Add video walkthroughs (links in guides)
- Q3 2026: Expand troubleshooting section based on support tickets

### Report Issues
- **Found error:** Email [admin team] with guide name + section + issue
- **Suggestion:** Email [admin team] with guide name + suggestion
- **Unclear section:** Email [admin team] with specific question

---

## 🎓 Learning Resources

### For Getting Help
- **Usage Question:** Start with your role guide's "Troubleshooting" section
- **Technical Issue:** Contact System Admin (reference **04_ADMIN_GUIDE.md** → "Troubleshooting")
- **Process Question:** Contact your Technical Lead or Project Manager
- **Access Problem:** Contact your help desk or IT support

### For Training New Team Members
1. Share **00_INDEX_AND_OVERVIEW.md** (context setting)
2. Share role-specific guide + **05_QUICK_REFERENCE_CARD.md**
3. Walk through **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → "Getting Started" (if first-time user)
4. Practice together using **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → "Step-by-Step Walkthrough"

---

## ✨ Highlights

### What Makes These Guides Effective
- **✅ Role-Based:** Each role gets exactly what they need (no fluff)
- **✅ Simple Language:** Explains technical concepts in plain English
- **✅ Examples Throughout:** Real scenarios with step-by-step walkthroughs
- **✅ Visual Tables:** Key decisions at a glance
- **✅ Cross-References:** Easy navigation between related topics
- **✅ Troubleshooting:** Practical solutions for common problems
- **✅ Quick Reference:** One-page card for common tasks
- **✅ Comprehensive:** From basic usage to advanced configuration

---

## 🚀 Getting Started

### First Time Using the Tool?
1. Read: **00_INDEX_AND_OVERVIEW.md** (2 min)
2. Read: Your role guide (15-30 min)
3. Try it: Run your first analysis or setup task
4. Keep: **05_QUICK_REFERENCE_CARD.md** (for later reference)

### Onboarding a New Team Member?
1. Give them: **00_INDEX_AND_OVERVIEW.md** + **05_QUICK_REFERENCE_CARD.md**
2. Walk through: Their role-specific "Getting Started" section
3. Practice together: Use **01_FUNCTIONAL_CONSULTANT_GUIDE.md** → walkthrough
4. Check in: Within 1 week to answer questions

### Setting Up the System for the First Time?
1. Read: **04_ADMIN_GUIDE.md** → "Master Data Architecture" (understand entities)
2. Follow: **04_ADMIN_GUIDE.md** → "Creating Seed Data (Step-by-Step)"
3. Validate: **04_ADMIN_GUIDE.md** → "CSV File Format & Validation"
4. Test: Run sample analysis to verify setup
5. Keep: **04_ADMIN_GUIDE.md** (ongoing reference)

---

## 📞 Support Information

| Type | Contact | Reference |
|------|---------|-----------|
| **How do I use the tool?** | See your role guide | Go to: **00_INDEX_AND_OVERVIEW.md** |
| **The wizard is broken** | System Admin | See: **04_ADMIN_GUIDE.md** → Troubleshooting |
| **I disagree with recommendation** | Technical Lead | See: **02_SOLUTION_ARCHITECT_GUIDE.md** → Troubleshooting |
| **How do I forecast schedule?** | Project Manager | See: **03_PROJECT_MANAGER_GUIDE.md** → Effort & Schedule |
| **How do I set up the system?** | System Admin | See: **04_ADMIN_GUIDE.md** → Creating Seed Data |
| **Quick reference needed** | Everyone | Use: **05_QUICK_REFERENCE_CARD.md** |

---

## ✅ Checklist for Document Users

- [ ] I've read **00_INDEX_AND_OVERVIEW.md**
- [ ] I've read my role-specific guide (Sections 1-3)
- [ ] I've printed/bookmarked **05_QUICK_REFERENCE_CARD.md**
- [ ] I know who to contact for help in my area
- [ ] I know where to find troubleshooting information
- [ ] I understand the key concepts for my role

---

**Questions?** Check **00_INDEX_AND_OVERVIEW.md** → "Support & Escalation"

**Ready to get started?** Jump to your role guide:
- 🔵 [Functional Consultant](01_FUNCTIONAL_CONSULTANT_GUIDE.md)
- 🟣 [Solution Architect](02_SOLUTION_ARCHITECT_GUIDE.md)
- 🟢 [Project Manager](03_PROJECT_MANAGER_GUIDE.md)
- 🟠 [Administrator](04_ADMIN_GUIDE.md)

---

**Last Updated:** December 2, 2025  
**Document Version:** 1.0  
**Status:** Ready for Production Use
