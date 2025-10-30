# SAP Clean Core Solution Advisor

A decision support application for selecting clean core approaches in SAP S/4HANA implementations. Built on SAP Cloud Application Programming Model (CAP) with SAP Fiori UI.

## Project Overview

This application transforms an Excel-based decision framework into a scalable, multi-tenant SaaS solution that guides solution architects through RICEFW (Reports, Interfaces, Conversions, Enhancements, Forms, Workflows) object analysis to determine the optimal clean core level (A/B/C/D).

### Key Features

- **Guided Wizard**: Multi-step decision wizard with contextual examples and constraints
- **Scoring Metrics**: Technical Debt, Cloud Readiness, and Upgrade Impact scoring
- **Decision Flowchart**: Visual representation of decision paths using D3.js
- **Email Notifications**: Automated alerts for analysis completion, threshold violations, and session expiry
- **Multi-tenancy**: Isolated data per tenant with CAP MTX
- **Real-world Examples**: Knowledge base of successful implementations
- **Performance Constraints**: Auto-display of technical limitations and compliance requirements

## Project Structure

File or Folder | Purpose
---------|----------
`app/` | SAP Fiori UI5 application (Wizard, Dashboards, Admin panels)
`db/` | Domain models (CDS schema) and master data (CSV)
`srv/` | OData services and business logic (Decision Engine, Scoring, Notifications)
`test/` | Unit, integration, and E2E tests (Jest, OPA5, UIVeri5)
`docs/` | Comprehensive documentation and guides
`package.json` | Project metadata and configuration
`.env.example` | Environment variable template (copy to .env)

## Quick Start

### Prerequisites

- Node.js 18+ LTS
- SAP HANA Cloud instance (for production) or SQLite (for local development)
- CF CLI (for BTP deployment)

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (optional for email notifications):
   ```bash
   cp .env.example .env
   # Edit .env with your SMTP credentials
   ```

3. **Start development server**:
   ```bash
   npm run start-local
   # OR use VS Code task: Terminal > Run Task > cds watch
   ```

4. **Access application**:
   - App: http://localhost:4004
   - OData Service: http://localhost:4004/service/SolutionAdvisorSvcs

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (requires app running)
npm run test:e2e
```

## Documentation

- **[Email Integration Guide](docs/EMAIL_INTEGRATION_GUIDE.md)**: Configure SMTP notifications
- **[Testing Quick Start](TESTING_QUICKSTART.md)**: Setup and run tests
- **[Technical Specification](.github/technical specification/)**: Complete functional specs

## Email Notifications Setup

The application supports automated email notifications for critical events. See [Email Integration Guide](docs/EMAIL_INTEGRATION_GUIDE.md) for detailed setup.

**Quick Setup**:

1. Copy `.env.example` to `.env`
2. Configure SMTP credentials:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-app-specific-password
   SMTP_FROM="Solution Advisor <no-reply@example.com>"
   ```
3. Restart the application

**Supported Providers**: Gmail, SendGrid, Office 365, Corporate SMTP

## Deployment to SAP BTP

### Build MTA Archive

```bash
npm run build
# OR
mbt build
```

### Deploy to Cloud Foundry

```bash
cf login
cf deploy mta_archives/SolutionAdvisor_1.0.0.mtar
```

### Configure SMTP in Production

Store credentials in BTP Credential Store:

```bash
cf create-service credstore standard solutionadvisor-credstore
cf create-service-key solutionadvisor-credstore local-key
```

See [Email Integration Guide](docs/EMAIL_INTEGRATION_GUIDE.md) for production setup.

## Technology Stack

- **Backend**: SAP CAP 7.x+ (Node.js 18+)
- **Database**: SAP HANA Cloud (multi-tenant)
- **Frontend**: SAP Fiori Elements + UI5 1.120+
- **Visualization**: D3.js for decision flowcharts
- **Authentication**: XSUAA (SAP Authorization and Trust Management)
- **Email**: Nodemailer with SMTP
- **Testing**: Jest (unit), OPA5 (UI), UIVeri5 (E2E)

## Project Status

**Current Completion**: ~73% (up from 50% baseline)

Recent additions:
- ✅ Notification Center UI
- ✅ History Timeline View with VizFrame charts
- ✅ Flowchart Zoom/Pan controls
- ✅ Email integration with Nodemailer

See [Detailed TODO List](DETAILED_TODO_LIST.md) for remaining tasks.

## Architecture Decisions

- **Shell Strategy**: Fiori Launchpad integration ([Shell Architecture](SHELL_ARCHITECTURE_DECISION.md))
- **Multi-tenancy**: HANA schema-based tenant isolation
- **OData Version**: V4 exclusively (no V2 compatibility)
- **Decision Tree**: JSON-based navigation logic in QuestionFlow entity

## Learn More

- **SAP CAP**: https://cap.cloud.sap/docs
- **SAP Fiori Design**: https://experience.sap.com/fiori-design
- **HANA Cloud Multi-tenancy**: https://help.sap.com/hana-cloud
- **Clean Core Methodology**: https://www.sap.com/products/erp/s4hana/clean-core.html

## Support

For issues or questions:
1. Check [Email Integration Guide](docs/EMAIL_INTEGRATION_GUIDE.md) for SMTP troubleshooting
2. Review [Testing Status](TESTING_STATUS.md) for known issues
3. Check application logs: `cf logs solutionadvisor-srv --recent`

---

**Note**: Original VCAP_SERVICES setup for local approuter testing:
```bash
export VCAP_SERVICES='your full JSON block here'
cf create-service-key SolutionAdvisor-auth local-key
cf service-key SolutionAdvisor-auth local-key
```

**Maintained by**: Solution Advisor Development Team  
**Last Updated**: 2025-01-XX

 "service": "html5-apps-repo-rt",