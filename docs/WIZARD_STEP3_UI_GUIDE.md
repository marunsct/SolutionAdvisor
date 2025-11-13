# Step 3 UI Changes - Visual Guide

## Before: Embedded Guidance View

```
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Clean Core Guidance                            [Next]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [FULL GUIDANCE VIEW EMBEDDED HERE]                          │
│  - Clean Core Level Definitions                             │
│  - Design approaches, tools, examples                       │
│  - Performance metrics                                       │
│  - All content visible in wizard step                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## After: Button with Dialog

### Step 3 Layout (Initial State)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Clean Core Guidance                            [Next]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│           📖 Learn Clean Core Levels                         │
│                                                               │
│  Click the button below to explore Clean Core levels        │
│  (A, B, C, D) for your selected object type and            │
│  understand the design approaches, tools, and best         │
│  practices.                                                  │
│                                                               │
│        [Learn Clean Core Levels for Reports]                │
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Dialog After Button Click

```
╔═════════════════════════════════════════════════════════════╗
║  Clean Core Levels for Reports                         [X]  ║
╠═════════════════════════════════════════════════════════════╣
║                                                               ║
║  [GUIDANCE VIEW CONTENT IN DIALOG]                          ║
║  - Clean Core Level A Description                          ║
║  - Clean Core Level B Description                          ║
║  - Clean Core Level C Description                          ║
║  - Clean Core Level D Description                          ║
║  - Tools, examples, performance metrics                    ║
║  - Best practices and recommendations                      ║
║                                                               ║
║  [Dialog is resizable and draggable]                        ║
║  [User can still see wizard behind dialog]                 ║
║                                                               ║
╠═════════════════════════════════════════════════════════════╣
║                                              [Close]         ║
╚═════════════════════════════════════════════════════════════╝
```

## Dynamic Button Text Examples

| Object Type Selected | Button Text |
|---------------------|-------------|
| Reports | `Learn Clean Core Levels for Reports` |
| Interfaces | `Learn Clean Core Levels for Interfaces` |
| Conversions | `Learn Clean Core Levels for Conversions` |
| Enhancements | `Learn Clean Core Levels for Enhancements` |
| Forms | `Learn Clean Core Levels for Forms` |
| Workflows | `Learn Clean Core Levels for Workflows` |

## Dialog Features

✅ **Responsive Design**
- 90% width and height of viewport
- Centers on screen
- Responsive margins

✅ **Close Options** (2 ways)
- Close button (X) in top-right corner
- Close button in bottom footer

✅ **User Interactions**
- Resizable: Drag corners to resize
- Draggable: Drag header to move
- Modal: Blocks interaction with wizard until closed

✅ **Content Management**
- Loads Guidance view dynamically
- Passes RICEFW type to show relevant content
- Dialog destroyed after close to free memory

## Code Flow

```
User in Step 3
    ↓
Sees descriptive layout with button
    ↓
Clicks "Learn Clean Core Levels for {Type}" button
    ↓
onLearnCleanCoreLevels() triggered
    ↓
Extract RICEFW type from selection
    ↓
sap.ui.core.Fragment.load("GuidanceDialog")
    ↓
Add dialog as dependent
    ↓
Load Guidance view and call loadGuidance(ricefwType)
    ↓
oDialog.open()
    ↓
Dialog displays with guidance content
    ↓
User clicks Close button or X icon
    ↓
onCloseGuidanceDialog() triggered
    ↓
Dialog closes
    ↓
setTimeout(() => dialog.destroy()) // Free resources
    ↓
Back to Step 3 layout
```

## Advantages Over Embedded View

| Aspect | Before (Embedded) | After (Dialog) |
|--------|-------------------|-----------------|
| **Screen Real Estate** | Full wizard step used | Clean, focused Step 3 |
| **Context Awareness** | Loses wizard context | Can see wizard behind dialog |
| **User Control** | Always visible, can't hide | User controls when to view |
| **Navigation** | Can't interact with wizard | Can pause to review guidance |
| **Visual Hierarchy** | Guidance dominates Step 3 | Button is clear CTA |
| **Flexibility** | Fixed size in wizard | Resizable dialog |
| **Memory** | Always loaded | Loaded only when needed |
| **UX Pattern** | Non-standard | Standard SAP Fiori dialog |

