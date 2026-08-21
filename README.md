# FlowPilot AI

AI-powered operations workspace that helps small businesses automate repetitive work without needing to build complex integrations.

## Real-world use case

A support or operations team connects their inbox, CRM, Slack, and internal knowledge. FlowPilot receives an event, classifies it with an AI agent, retrieves relevant company knowledge, proposes an action, asks for approval when needed, executes the action, and records an audit trail.

## Product goals

- Simple workflow builder for non-technical users
- AI-assisted ticket and request triage
- Company knowledge search with RAG
- Human approval for sensitive actions
- Reliable background jobs and retries
- Team workspaces and role-based access
- Usage tracking and audit logs
- Integration-ready architecture for Slack, email, CRM and webhooks

## Stack

Next.js, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Redis, BullMQ, OpenAI API, pgvector, Zod, Docker, GitHub Actions, and OpenTelemetry.

## Architecture

```text
Browser
  -> Next.js App Router
  -> API / Server Actions
  -> PostgreSQL + Prisma
  -> Redis + BullMQ workers
  -> AI service + pgvector RAG
  -> Integration adapters
  -> Audit logs / OpenTelemetry
```

## Development phases

1. Product dashboard and workflow builder
2. Authentication and workspace RBAC
3. PostgreSQL persistence and migrations
4. Redis job queue and worker
5. AI agent + RAG knowledge base
6. Approval system and audit logs
7. Slack/email/webhook integrations
8. Usage metering, billing, tests, CI/CD and deployment

This repository is intentionally built as a real product architecture rather than a tutorial CRUD application.
