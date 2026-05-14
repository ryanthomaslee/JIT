# JAI Behavioural: Burnout Recovery & Assessment Platform (JIT)

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Firebase](https://img.shields.io/badge/Firebase-Backend-orange)
![AI Powered](https://img.shields.io/badge/AI-Behavioural%20Insights-gold)

## Executive Summary

This repository contains the frontend and backend codebase for the JAI Behavioural web platform.

Built to operationalise the proprietary **NEU Framework**, this application serves as a scalable digital intervention tool for occupational burnout. It translates clinical behavioural science research into an interactive user experience, allowing individuals to:
- assess burnout domains
- receive AI-driven insights
- access personalised recovery exercises

The platform demonstrates the intersection of organisational psychology and full-stack development, delivering data-driven interventions through a modern web architecture.

Built to operationalise behavioural science research into a scalable organisational wellbeing infrastructure.

---

# Platform Preview

## Burnout Dashboard

<p align="center">
  <img width="1200" alt="JIT Dashboard" src="https://github.com/user-attachments/assets/20ba11e8-8982-4f2a-a048-4501a5d44546" />
</p>

---

## Recovery Intervention Flow

<p align="center">
  <img width="1200" alt="JIT Recovery Intervention Flow" src="https://github.com/user-attachments/assets/a4625872-1965-49e4-adc7-5fef413ac1e6" />
</p>

## NEUY Interaction

<img width="369" height="437" alt="Screenshot 2026-05-14 at 10 04 25" src="https://github.com/user-attachments/assets/04322099-f4e7-4216-ab7b-aee0db90f8fa" />

---

# Core Features

### Dynamic Burnout Assessment
A guided evaluation flow (`/assessment`) that quantifies burnout across distinct psychological domains:
- Emotional
- Motivation
- Relational
- Cognitive

---

### AI-Powered Insights (NEUY)
Integration of generative AI (`NEUYChat` and burnout insight flows) to synthesise assessment data into personalised, actionable recovery strategies.

---

### Targeted Recovery Protocols
A dedicated exercise module (`/exercises`) offering evidence-based behavioural interventions tailored to the user's specific burnout profile.

---

### User Dashboard & Analytics
Secure, authenticated portals (`/dashboard`) for users to track well-being trajectory and intervention efficacy over time.

---

### Tiered Onboarding
Custom orientation flows (`/onboarding`, `/tier-orientation`) to seamlessly integrate users into the appropriate organisational or individual tracks.

---

# Technical Architecture

This application is built with a modern, serverless technology stack optimised for performance and rapid iteration.

### Frontend Framework
- Next.js (App Router)
- React

### Styling
- Tailwind CSS for responsive, accessible UI components

### Backend & Infrastructure
- Google Firebase
  - Firestore
  - Firebase Authentication
  - Firebase Hosting

### AI Integration
Implements Genkit for structured AI flows (`generate-burnout-insights.ts`) to ensure reliable and compliant behavioural recommendations.

### Development Workflow
Built using an AI-assisted development methodology, leveraging Claude Code to accelerate architecture design and component generation.

### Language
- TypeScript for end-to-end type safety and robust state management

---

# Strategic Value

Beyond its technical implementation, this platform serves as a pilot architecture for scaling behavioural interventions.

By digitising the NEU Framework, the application allows for:
- real-time data collection
- continuous iteration of recovery protocols
- quantifiable organisational wellbeing metrics

It is designed not just as a wellness tool, but as a strategic asset for structural burnout prevention.
