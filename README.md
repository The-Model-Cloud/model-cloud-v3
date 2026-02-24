# The Model Cloud

A comprehensive model booking and management platform that connects clients with professional models. The platform enables direct model discovery, self-service booking, integrated payments, and organisation-level management tools.

## Overview

The Model Cloud is a monorepo containing two applications:

- **Platform** (`apps/platform`) - The main dashboard application for clients, models, and administrators
- **Website** (`apps/website`) - The public-facing brochure site with pricing, sign-up, and subscription management

Both applications share the same Firebase backend, including Firestore database, Cloud Functions, and Authentication.

## Tech Stack

### Platform (apps/platform)

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Material UI (MUI) 5 | Component library |
| React Router 6 | Client-side routing |
| Firebase 11 | Authentication, Firestore, Storage |
| Stripe | Payment processing |
| Chart.js | Analytics visualisations |
| FullCalendar | Calendar components |
| TipTap | Rich text editor |

### Website (apps/website)

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with SSR |
| React 19 | UI framework |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | Component library |
| Firebase 12 | Authentication, Firestore |
| Stripe | Subscription checkout |

### Shared Backend

| Technology | Purpose |
|------------|---------|
| Firebase Cloud Functions | Serverless API |
| Firestore | NoSQL database |
| Firebase Auth | User authentication |
| Firebase Storage | File/image storage |
| SendGrid | Transactional emails |
| Stripe Connect | Model payouts |
| Cloudinary | Image optimisation |

## Project Structure

```
model-cloud-v4/
├── apps/
│   ├── platform/              # React + MUI dashboard app
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── context/       # React context providers
│   │   │   ├── layouts/       # Page layouts and views
│   │   │   ├── utils/         # Helper functions
│   │   │   ├── routes.js      # Route definitions
│   │   │   └── App.js         # App entry point
│   │   ├── public/
│   │   └── package.json
│   │
│   └── website/               # Next.js public website
│       ├── src/
│       │   ├── app/           # Next.js app router pages
│       │   ├── components/    # UI components
│       │   ├── contexts/      # React contexts
│       │   ├── lib/           # Utilities and hooks
│       │   └── types/         # TypeScript types
│       └── package.json
│
├── functions/                 # Firebase Cloud Functions
│   ├── index.js              # Function definitions
│   └── package.json
│
├── documentation/            # Project documentation
├── firebase.json             # Firebase configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── .firebaserc              # Firebase project settings
└── package.json             # Root monorepo scripts
```

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Access to the Firebase project (model-cloud)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd model-cloud-v4
```

### 2. Install dependencies

```bash
# Install all dependencies (platform, website, and functions)
npm run install:all

# Or install individually:
npm run install:platform
npm run install:website
npm run install:functions
```

### 3. Environment setup

Each app requires its own environment file with the appropriate prefix:

**Platform** (`apps/platform/.env`):
```env
# Firebase (REACT_APP_ prefix for Create React App)
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_...

# Cloudinary
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
REACT_APP_CLOUDINARY_API_KEY=your-api-key
REACT_APP_CLOUDINARY_UPLOAD_PRESET=ml_default
```

**Website** (`apps/website/.env.local`):
```env
# Firebase (NEXT_PUBLIC_ prefix for Next.js)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# App URL
NEXT_PUBLIC_APP_URL=https://v4.themodel.cloud
```

**Cloud Functions** (`functions/.env`):
```env
# Stripe (server-side)
STRIPE_SECRET_KEY=sk_...

# SendGrid
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@themodel.cloud

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Mailchimp (for marketing email subscriptions)
MAILCHIMP_API_KEY=your-mailchimp-api-key
MAILCHIMP_AUDIENCE_ID=your-audience-list-id
MAILCHIMP_SERVER_PREFIX=us21
```

### 4. Run the applications

```bash
# Run platform (React app) on http://localhost:3000
npm run dev:platform

# Run website (Next.js) on http://localhost:3001
npm run dev:website
```

## Available Scripts

Run these from the root directory:

| Command | Description |
|---------|-------------|
| `npm run dev:platform` | Start platform dev server |
| `npm run dev:website` | Start website dev server |
| `npm run build:platform` | Build platform for production |
| `npm run build:website` | Build website for production |
| `npm run build:all` | Build both applications |
| `npm run install:all` | Install all dependencies |
| `npm run deploy:platform` | Build and deploy platform to 20i (FTP) |
| `npm run deploy:website` | Build and deploy website to 20i (FTP) |
| `npm run deploy:functions` | Deploy Cloud Functions to Firebase |
| `npm run deploy:firestore` | Deploy Firestore rules and indexes |
| `npm run deploy:all` | Build and deploy everything |

## Deployment

### Hosting Setup

Both the **Platform** and **Website** are deployed to **20i hosting via FTP**. Firebase is used only for backend services (Cloud Functions, Firestore, Auth, Storage).

| Application | Hosting | URL |
|-------------|---------|-----|
| Platform | 20i (FTP) | https://v4.themodel.cloud |
| Website | 20i (FTP) | https://sandbox.themodel.cloud |
| Cloud Functions | Firebase | europe-west2 |

### FTP Configuration

Each app requires FTP credentials in its environment file:

**Platform** (`apps/platform/.env`):
```env
FTP_USER=your-ftp-user
FTP_PASSWORD=your-ftp-password
FTP_HOST=ftp.gb.stackcp.com
FTP_PORT=21
FTP_REMOTE_ROOT=/
```

**Website** (`apps/website/.env.local`):
```env
FTP_USER=your-ftp-user
FTP_PASSWORD=your-ftp-password
FTP_HOST=ftp.gb.stackcp.com
FTP_PORT=21
FTP_REMOTE_ROOT=/sandbox
```

### Firebase Setup (for Cloud Functions)

1. Login to Firebase:
   ```bash
   firebase login
   ```

2. Select the project:
   ```bash
   firebase use model-cloud
   ```

### Deploy Individual Components

```bash
# Deploy only the platform (builds then FTP uploads)
npm run deploy:platform

# Deploy only the website (builds then FTP uploads)
npm run deploy:website

# Deploy Cloud Functions to Firebase
npm run deploy:functions

# Deploy Firestore rules
npm run deploy:firestore
```

### Deploy Everything

```bash
npm run deploy:all
```

**Note:** The `.htaccess` file is automatically included in deployments to maintain server configuration (Basic Auth, caching headers, etc.).

## Key Features

### For Models
- Profile creation with portfolio
- Z-card generation
- Job applications and invitations
- Availability calendar
- Earnings dashboard
- Stripe Connect payouts

### For Clients
- Browse and search models
- Create job postings
- Invite models to jobs
- Secure payments with escrow
- Organisation dashboards
- Team management

### For Organisations
- Multi-user access with roles (Owner, Admin, Member)
- Team structure and permissions
- Organisation-level favourites
- Centralised job management
- Spend analytics and reporting

### For Administrators
- Platform-wide dashboard
- User management
- Organisation management
- Pricing tier configuration
- Client/model import tools
- System-wide email toggle

## Email Notifications

The platform sends automated email notifications based on user preferences. Users can control their notification settings in Platform Settings.

### Notification Types

| Notification | Recipients | Trigger |
|--------------|------------|---------|
| New Message | All users | When someone sends a message |
| Job Match | Models | When a new job matches their profile |
| Matching Models | Clients | When posting a job, list of matching models |
| Job Application | Clients | When a model applies to their job |
| Application Confirmation | Models | When they apply to a job |
| Job Invitation | Models | When invited to apply for a job |
| Account Verification | Models | When admin verifies their account |
| Welcome Email | All users | After registration |

### Marketing Subscriptions (Mailchimp)

Users can opt-in to marketing emails synced with Mailchimp:

| Tag | Description |
|-----|-------------|
| New Launches | New features and product launches |
| Product Updates | Monthly platform updates |
| Newsletter | General news and industry insights |

### Email Templates

All email templates are defined in `functions/index.js`. Search for `html:` to find template locations.

## User Roles

| Role | Access Level |
|------|--------------|
| Model | Profile management, job applications, earnings |
| Client | Job creation, model booking, payments |
| Account Manager | Organisation management, team oversight |
| Admin | User management, platform configuration |
| Super Admin | Full access including system settings |

## Subscription Tiers

| Tier | Description |
|------|-------------|
| Free | 7-day trial, limited features |
| Starter | Basic features for individuals |
| Professional | Advanced features, multiple seats |
| Enterprise | Full features, unlimited seats |
| Agency | Seat management for client accounts |

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with both apps
4. Create a pull request

## Documentation

Additional documentation is available in the `documentation/` folder:

- [Implementation Plan](documentation/implementation-plan.md) - Feature development roadmap and completed features
- [Press Release Gap Checklist](documentation/press-release-gap-checklist.md) - Feature status tracking
- [Phase 1 Verification Checklist](documentation/phase-1-verification-checklist.md) - Launch readiness testing

### Key Implementation Details

| Feature | Documentation Section |
|---------|----------------------|
| Book Model Button | Implementation Plan §1.1 |
| Organisation Teams | Implementation Plan §1.2 |
| Organisation Dashboard | Implementation Plan §1.3 |
| Job-Organisation Linking | Implementation Plan §1.4 |
| Organisation Favourites | Implementation Plan §1.5 |
| Email Notifications | Implementation Plan §2.6 |
| Model Matching Algorithm | `apps/platform/src/utils/matching.js` |

## License

Proprietary - All rights reserved.

## Support

For technical support or questions, please contact the development team.
