# JAI Behavioural: Burnout Recovery & Assessment Platform (JIT)

## Executive Summary
This repository contains the frontend and backend codebase for the JAI Behavioural web platform. Built to operationalise the proprietary NEU Framework, this application serves as a scalable digital intervention tool for occupational burnout. It translates clinical behavioural science research into an interactive user experience, allowing individuals to assess their burnout domains, receive AI-driven insights, and access personalised recovery exercises.

The platform demonstrates the intersection of organisational psychology and full-stack development, delivering data-driven interventions through a modern web architecture.

## Core Features
* **Dynamic Burnout Assessment:** A guided evaluation flow (`/assessment`) that quantifies burnout across distinct psychological domains (Emotional, Motivation, Relational, Cognitive).
* **AI-Powered Insights (NEUY):** Integration of generative AI (`NEUYChat` and burnout insight flows) to synthesise assessment data into personalised, actionable recovery strategies.
* **Targeted Recovery Protocols:** A dedicated exercise module (`/exercises`) offering evidence-based behavioural interventions tailored to the user's specific burnout profile.
* **User Dashboard & Analytics:** Secure, authenticated portals (`/dashboard`) for users to track their well-being trajectory and intervention efficacy over time.
* **Tiered Onboarding:** Custom orientation flows (`/onboarding`, `/tier-orientation`) to seamlessly integrate users into the appropriate organisational or individual tracks.

## Technical Architecture
This application is built with a modern, serverless technology stack optimised for performance and rapid iteration:

* **Frontend Framework:** Next.js (App Router) & React
* **Styling:** Tailwind CSS for responsive, accessible UI components
* **Backend & Infrastructure:** Google Firebase (Firestore for database rules, Firebase Auth, and Firebase Hosting)
* **AI Integration:** Implements Genkit for structured AI flows (`generate-burnout-insights.ts`) to ensure reliable and compliant behavioural recommendations. 
* **Development Workflow:** Built using an AI-assisted development methodology, leveraging Claude Code to accelerate architecture design and component generation.
* **Language:** TypeScript for end-to-end type safety and robust state management.

## Strategic Value
Beyond its technical implementation, this platform serves as a pilot architecture for scaling behavioural interventions. By digitising the NEU framework, the application allows for real-time data collection, continuous iteration of recovery protocols, and quantifiable metrics on organisational well-being. It is designed not just as a wellness tool, but as a strategic asset for structural burnout prevention.

## Local Development
To run this project locally:

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your local `.env.local` with the necessary Firebase and AI API keys.
4. Run the development server: `npm run dev`
5. Navigate to `http://localhost:3000`
