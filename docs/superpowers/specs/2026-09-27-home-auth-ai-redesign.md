# Home, Auth, and AI Redesign

## Goal

Reshape the platform from a CRUD-looking terminology tool into a public-facing cultural knowledge platform with a small protected admin area. The first impression should feel like a national-level student innovation project from a foreign languages college: polished, research-oriented, culturally grounded, and easy to present.

This redesign covers three connected surfaces:

- The homepage becomes an introductory digital exhibition, not a search or management screen.
- Authentication has two roles only: normal user and admin.
- The AI assistant becomes a research drawer, not a small customer-service-style chat box.

## Current Problems

The homepage mixes project positioning, search, workflow, featured terms, cultural topics, and management-like entry points in a way that feels visually flat and structurally confused. The search box in the hero makes the platform look like a basic term lookup site before it has established its research value.

The admin area exists, but it is currently presented as a normal navigation item. The backend admin endpoints are also not protected, which is unsuitable for public deployment.

The AI assistant is globally available, but the current small floating chat shape feels generic. It does not communicate that AI is part of the terminology production and cross-cultural expression workflow.

## Roles

Only two account roles are needed.

### Normal User

Normal users can access public and research-facing features:

- Homepage and project introduction
- Term discovery and term detail pages
- Cultural topics, including the Huai River culture topic
- Expression lab
- Reading preference modes, including child mode and large-text mode
- AI assistant

Normal users cannot access term management or admin APIs.

### Admin

Admins can do everything normal users can do, plus:

- Open the term management page
- Create terms
- Edit terms
- Delete terms when dependency rules allow it
- Change term publication status

Future user management and topic management can be added later, but they are out of scope for this pass.

## Public Access

The platform should not force every visitor to log in. Public visitors should still see the showcase value of the project:

- Homepage
- Project/about page
- Published term discovery
- Published term details
- Cultural topics

Login becomes necessary for signed-in user affordances and for admin-only management. This keeps the system suitable for public deployment and project demonstration.

## Homepage Design

The homepage should be rebuilt as a digital cultural exhibition.

### First Screen

The first viewport should introduce the project, not offer search.

Recommended structure:

- Large project title: "中国特色话语多语术语库工程化建设与研究"
- Short explanatory paragraph about terminology collection, conceptual interpretation, multilingual expression, AI assistance, and human review
- Two primary routes: term discovery and project introduction
- A dynamic knowledge visual on the right or as a full-width stage

The visual should feel like a terminology knowledge constellation:

- Nodes for core layer, expansion layer, source layer, Huai River culture, intercultural expression, AI assistance, and human review
- Light connecting lines
- Slow ambient motion
- Subtle pointer response

The implementation should use HTML/CSS/React rather than a heavy 3D engine unless a later visual pass needs true 3D.

### Production Loop

Add a section that explains the terminology production loop:

Collection -> normalization -> AI-assisted expression -> human review -> multilingual publication -> feedback revision.

This should be presented as a flowing track or loop, not a plain list of cards.

### Three-Layer Term System

Present the term system as layered knowledge:

- Source layer: traditional cultural roots
- Core layer: key concepts in contemporary Chinese discourse
- Expansion layer: social, regional, and cultural extension

The visual metaphor should be layered strata or stacked planes, not simple rows.

### Huai River Culture Preview

Show the Huai River culture topic as a demonstration topic:

- A small knowledge-map preview
- The path from regional culture to term, translation, and communication context
- A route into the full topic page

### Capability Entrances

Near the lower part of the homepage, provide refined entrances to:

- Term discovery
- Expression lab
- Cultural topics
- Project outcomes

Only admins should see term management as an entrance after login.

## Navigation

Navigation should reflect the current role.

Unauthenticated visitors:

- Home
- Term discovery
- Cultural topics
- Expression lab
- Project
- Login

Normal users:

- Home
- Term discovery
- Cultural topics
- Expression lab
- Project
- User status / logout

Admins:

- All normal user items
- Term management
- User status / logout

The current reading preference controls should remain global.

## Authentication

Implement lightweight project authentication with demo accounts.

Suggested demo accounts:

- Normal user: `user / 123456`
- Admin: `admin / 123456`

Security posture for this project phase:

- Store password hashes, not plaintext passwords.
- Return a session token or signed auth token from login.
- Persist the frontend auth state in local storage.
- Attach auth to admin API requests.
- Reject non-admin requests to admin endpoints.

Registration, email verification, password reset, and third-party login are out of scope.

## AI Assistant

Replace the small generic chat box with a research assistant pattern.

### Floating Entry

The closed state should be a refined "文脉 AI" floating entry:

- Compact button with an icon-like mark
- Subtle breathing or line-flow animation
- Hover expansion on desktop
- Mobile placement that does not block core content

It should feel like a platform capability, not customer service.

### Open State

The open state should be a right-side research drawer on desktop and a bottom sheet or full-height drawer on mobile.

The drawer should include:

- Title: "文脉 AI 助手"
- Mode chips: terminology explanation, translation comparison, Huai River guide, child-friendly explanation
- Conversation area styled like research notes
- Suggested prompts such as:
  - 解释这个术语
  - 换成儿童能懂的话
  - 比较中英表达
  - 生成传播文案
  - 关联淮河文化专题

The assistant should stay visually connected to the project workflow. It should not look like a generic web chat plugin.

## Child Mode and Large Text

These remain reading modes, not account roles.

Child mode should affect:

- Friendlier copy where already supported
- Softer visual tone
- Simpler AI quick prompts

Large-text mode should affect:

- Body text
- Navigation
- Buttons
- AI drawer text
- Homepage section text

## Backend Scope

Add authentication support and protect admin APIs.

Expected backend work:

- User model or minimal user table
- Seed/demo users
- Login endpoint
- Current-user endpoint
- Logout if session-based auth is used
- Admin guard for `/api/v1/admin/*`
- Tests for normal user rejection and admin success

## Frontend Scope

Expected frontend work:

- Auth service and auth context
- Login page
- Protected route handling for `/manage`
- Role-aware navigation
- Homepage redesign
- AI assistant redesign
- Tests for navigation visibility, login behavior, protected management route, and AI drawer rendering

## Non-Goals

- Full enterprise RBAC
- User registration
- Email verification
- Password reset
- Audit logs
- Topic management UI
- Replacing every page's design in the same pass
- True 3D engine integration unless the CSS/React visual proves insufficient

## Verification

Before completion:

- Backend tests pass
- Frontend tests pass
- Frontend build passes
- Lint has no new errors
- Manual desktop and mobile visual checks cover homepage, login, AI drawer, and term management access
- Verify normal users cannot call admin APIs
- Verify admins can manage terms

