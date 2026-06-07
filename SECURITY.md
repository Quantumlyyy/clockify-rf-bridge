# Security

## Reporting a vulnerability

If you believe you have found a security issue in this project, please report it
privately rather than opening a public GitHub issue.

Email: [nejc.drobnic@quantumly.si](mailto:nejc.drobnic@quantumly.si)

Include as much detail as you can:

- What you found and where (file, route, or flow)
- Steps to reproduce
- Potential impact

We will acknowledge receipt and follow up when we have more information.

## Scope

This add-on handles Clockify install tokens and Request Finance API keys.
Both are encrypted at rest in per-workspace Durable Object storage using a
Cloudflare Secrets Store key (`RF_KEK`). Never commit `.dev.vars`, API keys,
or production Cloudflare resource IDs.
