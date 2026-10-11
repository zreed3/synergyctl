# Commercial CLI And Marketing Platform Report

Date: 2026-06-15

Prepared from a local repository/workspace review, five delegated project assessments, and current primary vendor documentation for the major ad, analytics, hosting, email, ecommerce, and website-observation APIs.

## Executive Summary

The strongest commercial path is to build one governed marketing operations platform with two surfaces:

1. `growthctl`, a deterministic CLI for operators, agents, support, and implementation teams.
2. A multi-tenant marketing portal with per-business branded front ends and a shared backend/control plane.

The CLI should not replace existing business applications. It should standardize high-risk and repetitive workflows: launch campaign domains, publish landing pages, sync leads, test tracking, inspect SEO health, manage ad connector status, rotate tokens, export reports, and run weekly pipeline reviews.

The portal should not start as a general CRM. It should start as a "marketing command centre" that sits beside each business system of record: BrokerEngine for Chorus Finance, Bord.Room for hospitality operations, ecommerce/Shopify for Hashtag Dentist, website and local SEO tools for Prova Pizzeria, and partner-specific systems for CAABA/Balanix.

The reusable core should come from the Bord.Room multi-tenancy pattern and the Agentic CLI Dashboard/ADG pattern:

- Bord.Room contributes tenant isolation, membership, billing, platform admin, and email/CRM substrate patterns.
- Synergy Wholesale contributes infrastructure automation: domains, DNS, hosting, SSL, mail forwards, M365.
- Agentic CLI Dashboard/ADG contributes the safe execution model: agent to MCP to CLI to API, with guardrails, dry-run, runtime secret injection, and append-only audit.
- Chorus Finance contributes the clearest lead-generation operating model: canonical lead capture, consent evidence, BrokerEngine handoff, channel-quality reporting, and compliance gates.

## Evidence And Assessment Method

Five assessment agents reviewed the requested projects:

- Chorus Finance: local marketing guide under `/Users/zach/Documents/A_Marketing_Chorus`.
- Bord.Room: source of truth found under `/Users/zach/Development/bord.roomv4.1`; the originally discovered session folder was empty.
- ADG: local ADG plugin/docs plus adjacent dashboard architecture.
- Synergy Wholesale: current `synergyctl` repository at `/Users/zach/Documents/synergywholesale`.
- CLI Dashboard: architecture and static preview under `/Users/zach/Documents/agentic-cli-dashboard`.

Local evidence strength varies:

- Strong implementation evidence: Synergy Wholesale, Bord.Room.
- Strong architecture evidence: Agentic CLI Dashboard and ADG docs.
- Strong marketing strategy evidence but no app code: Chorus Finance.
- Limited local evidence in this review: Prova Pizzeria, OtterBlock/Singularity Integrations, CAABA/Balanix Solutions, Hashtag Dentist. Recommendations for these are therefore marked as strategic assumptions.

## Core Commercial Thesis

The commercial benefit is not "a CLI for every business" as a standalone product. The benefit is a shared operating layer that turns messy marketing and infrastructure work into auditable, repeatable commands.

The platform should reduce:

- Lost leads caused by broken forms, webhooks, CRM maps, or stale credentials.
- Ad waste caused by poor source tracking and weak offline conversion feedback.
- Website revenue leakage caused by slow pages, bad SEO indexing, broken conversion paths, and unknown user friction.
- Operational risk caused by sharing API keys, doing live writes without previews, or letting agents act without guardrails.
- Setup time for new businesses, client portals, landing pages, and campaigns.

It should increase:

- Speed to launch new campaigns and websites.
- Confidence in lead source quality, not just cost per lead.
- Ability to reuse connectors and reporting across all businesses.
- Auditability for regulated or sensitive sectors such as finance and dental ecommerce.
- Optional future revenue from packaging the system as an agency/operator product.

## Recommended Product Shape

### Product Name

Use a neutral internal name such as `growthops` for the platform and `growthctl` for the CLI. Avoid tying the cross-business platform too tightly to Bord.Room, Synergy, or a single client brand.

### Primary Surfaces

`growthctl` CLI:

- Used by operators, agents, implementation engineers, and support staff.
- Always supports `--json`.
- Uses `--dry-run` for billable, destructive, credential-changing, service-changing, audience-changing, ad-budget-changing, content-publishing, email-sending, and customer-notifying operations.
- Emits one parseable JSON value on stdout.
- Sends diagnostics to stderr.
- Records audit events for every tool call, secret read, approval, and external mutation.

Marketing portal:

- Tenant-scoped UI for each business.
- White-label capable: `marketing.provapizzeria...`, `portal.chorus...`, `store.hashtagdentist...` admin, or customer-specific URLs.
- Shared backend for tenants, connectors, secrets, approvals, campaigns, leads, reporting, and audit.
- Separate branded views per business, but one platform data model.

Connector workers:

- One connector per external API family.
- Each connector owns OAuth, token refresh, rate limits, retries, webhooks, and provider-specific edge cases.
- Connectors expose stable internal operations to the CLI and portal.

ADG/governance layer:

- Policy decision point for context, secret reads, approvals, and live mutations.
- Deny-by-default for high-risk actions.
- Append-only audit log.

## High-Level Architecture

```text
Operator / Agent / Portal
        |
        v
GrowthOps API and Policy Layer
        |
        +-- Tenant, RBAC, approvals, audit
        +-- Secret metadata and connector health
        +-- Lead, campaign, website, ecommerce, email models
        |
        v
Connector Runtime
        |
        +-- growthctl CLIs and MCP tools
        +-- OAuth/token vault
        +-- Webhook receivers
        +-- Queue workers
        |
        v
External APIs
        |
        +-- Meta, Google Ads, GA4, Search Console, GBP
        +-- Synergy, Cloudflare, Vercel
        +-- Mailchimp/Resend/Klaviyo
        +-- Shopify/Stripe
        +-- BrokerEngine/Zapier
        +-- Clarity/Hotjar/Sentry
```

## Project Reviews

### Chorus Finance

Local evidence shows a lead-generation operating guide, not a built application. The guide is commercially useful because it already defines the right marketing discipline: source tracking, consent, BrokerEngine intake, speed-to-lead, stage movement, and settled-loan feedback.

CLI benefit:

- `chorusctl leads validate`
- `chorusctl leads test-submit --source meta --dry-run`
- `chorusctl brokerengine field-map check`
- `chorusctl compliance consent-audit`
- `chorusctl reports source-quality`
- `chorusctl conversions export --platform google|meta`

API capabilities needed:

- `POST /leads`
- `POST /webhooks/forms`
- `POST /webhooks/meta-leads`
- `POST /webhooks/google-leads`
- `POST /webhooks/bookings`
- `POST /leads/{id}/route`
- `POST /brokerengine/cards`
- `PATCH /brokerengine/cards/{id}`
- `POST /events/stage-changed`
- `POST /consents`
- `GET /leads/{id}/consent`
- `POST /unsubscribe`
- `GET /reports/source-quality`
- `POST /offline-conversions`

Strategy:

- Start with two to three borrower segments.
- Use one canonical lead schema before adding more channels.
- Keep BrokerEngine as system of work.
- Build a command centre beside BrokerEngine, not a replacement CRM.
- Treat compliance approval as a launch gate for ads, pages, scripts, SMS, and email.

### Bord.Room

The real local source appears to be `/Users/zach/Development/bord.roomv4.1`, not the empty session folder. Bord.Room is the best candidate for multi-tenancy reuse: tenant membership, RLS isolation, billing, platform admin, tenant switching, and hidden CRM/email primitives already exist or are planned.

CLI benefit:

- Internal ops and partner/admin CLI, not frontline venue-manager CLI.
- Tenant provisioning.
- Release gates.
- Webhook replay.
- Integration diagnostics.
- DSAR/export.
- API key lifecycle.
- Billing support.
- Job/import control.

API capabilities needed:

- Versioned `/v1` API.
- Tenant-scoped API keys.
- OpenAPI documentation.
- Tenants, memberships, locations.
- Staff, roster, timesheets, attendance.
- Billing, invoices, subscriptions.
- Reporting and exports.
- Webhooks and integrations.
- Privacy/DSAR.
- Optional CRM/email endpoints if product strategy allows.

Strategy:

- Keep Bord.Room positioned as hospitality operations first.
- Reuse the multi-tenant substrate for GrowthOps where appropriate.
- Do not expose "CRM/marketing platform" promises inside Bord.Room unless that becomes an explicit product decision.
- Use Bord.Room as the infrastructure pattern, not necessarily the brand for the cross-business marketing system.

### ADG

ADG should be the governance and audit spine for AI-assisted operations. The commercial value is policy and evidence, especially when agents can change budgets, publish pages, sync leads, or touch customer data.

CLI benefit:

- Guardrail checks before every secret read and mutating tool call.
- Bounded context selection per tenant/workspace.
- Audit evidence for approvals, denials, secret reads, external API calls, and live mutations.
- DORA/operational reporting if the platform becomes a delivery engine.

API capabilities needed:

- `POST /guardrail-check`
- `POST /audit-events`
- `GET /audit-events`
- `POST /context/select`
- `GET /policy/effective`
- `POST /approvals`
- `PATCH /approvals/{id}`
- `GET /tools/allowed`
- `GET /secrets/metadata`

Strategy:

- Use ADG for operator/agent governance from day one.
- Keep it out of the customer-facing marketing promise.
- Make all high-risk actions fail closed when audit or guardrail checks fail.

### Synergy Wholesale

`synergyctl` is already a serious guardrailed CLI over the Synergy Wholesale SOAP/WSDL API. It exposes domains, DNS, hosting, SSL, M365, and account operations with JSON output, redaction, dry-run, and confirmation tokens.

CLI benefit:

- Immediate infrastructure connector for the cross-business platform.
- Domain search/register/renew/transfer.
- DNS zone and record management.
- URL forwards and mail forwards.
- Hosting service lifecycle.
- SSL issuance and renewal.
- M365 client/subscription operations.

API capabilities still needed for a broader platform:

- Product catalog/metadata if Synergy exposes it.
- Customer/account inventory.
- Billing/invoice/order history.
- Bulk portfolio workflows.
- Reporting and alerts.
- Webhooks or polling jobs for expiry and provisioning status.
- Stronger schema templates for JSON-body commands.

Strategy:

- Treat Synergy as the marketing infrastructure layer.
- Build higher-level commands such as:
  - `growthctl infra campaign-domain launch`
  - `growthctl infra dns diff`
  - `growthctl infra ssl renew-audit`
  - `growthctl infra landing-stack provision`
- Keep Synergy credentials isolated and IP-whitelisted.

### CLI Dashboard

The dashboard repo is an architecture and static preview, not a runnable product. The architecture is still valuable: ADG governance, per-service CLI binaries, MCP/skills, and Keychain-backed secret injection.

CLI/dashboard benefit:

- Provides the reference operating model for all connectors.
- The dashboard should become a control plane for connected CLIs, secret health, approvals, audit feed, connector status, and failed jobs.

API capabilities needed:

- Tool registry and schema discovery.
- Run/task status.
- Secret metadata and rotation status.
- Approval queue.
- Audit query.
- Connector health.
- Workspace/tenant binding.

Strategy:

- Turn the reference architecture into a real hosted product only after deciding local-only vs hosted multi-user.
- For hosted multi-user, replace macOS-only Keychain dependency with a production secret vault.

## Business-By-Business Strategy

### Prova Pizzeria

Primary goal: local demand, repeat customers, events/catering, reviews, delivery ordering, and margin-aware promotions.

Recommended portal modules:

- Local SEO dashboard.
- Google Business Profile performance and review workflow.
- Website conversion tracking.
- Menu/page freshness checks.
- Campaign calendar.
- Email/SMS list growth.
- Coupon/promo tracking.
- UTM-tagged campaigns for events and catering.

Recommended connectors:

- Google Business Profile.
- Google Search Console.
- GA4.
- Meta/Instagram.
- Google Ads.
- Email/SMS provider.
- Website host/CMS.
- POS/order platform when confirmed.

CLI examples:

- `growthctl prova gbp reviews list --json`
- `growthctl prova seo weekly-report --json`
- `growthctl prova campaign launch-local-offer --dry-run`
- `growthctl prova website check-conversions --json`

### Chorus Finance

Primary goal: compliant borrower lead generation and BrokerEngine pipeline quality.

Recommended portal modules:

- Lead command centre.
- Consent and unsubscribe evidence.
- Broker response SLA.
- Source quality and settlement feedback.
- Campaign approval workflow.
- Offline conversion export.

Recommended connectors:

- BrokerEngine/Zapier.
- Meta Lead Ads.
- Google Ads.
- GA4.
- Search Console.
- Google Calendar/Calendly.
- Email/SMS.
- Call tracking.

CLI examples:

- `growthctl chorus leads test --source google --dry-run`
- `growthctl chorus compliance claims check --campaign id`
- `growthctl chorus brokerengine sync-status --json`
- `growthctl chorus conversions upload --platform meta --dry-run`

### OtterBlock / Singularity Integrations

Primary goal: partner/integration services, authority content, lead capture, and operational delivery.

Recommended portal modules:

- Partner lead pipeline.
- Integration project tracker.
- Content/SEO authority publishing.
- Case study library.
- Technical discovery forms.
- Deployment and connector health.

Recommended connectors:

- Website/CMS.
- GitHub.
- Vercel/Cloudflare.
- GA4/Search Console.
- LinkedIn.
- Email/CRM.
- Support/ticketing if used.

CLI examples:

- `growthctl otterblock content publish --dry-run`
- `growthctl singularity connector health --json`
- `growthctl otterblock leads route --json`

### Bord.Room

Primary goal: SaaS acquisition, self-serve onboarding, hospitality partner leads, and customer lifecycle communication.

Recommended portal modules:

- SaaS funnel dashboard.
- Signup/onboarding health.
- Demo/waitlist lead queue.
- Email lifecycle campaigns.
- Integration readiness status.
- Stripe billing signals.

Recommended connectors:

- Stripe.
- Resend/email.
- Vercel/Cloudflare.
- GA4/Search Console.
- Meta/Google/LinkedIn ads as acquisition scales.
- Doshii, Xero, Deputy when product-ready.

CLI examples:

- `growthctl bordroom tenants provision --dry-run`
- `growthctl bordroom signup audit --json`
- `growthctl bordroom webhooks replay --provider stripe --dry-run`
- `growthctl bordroom lifecycle-email send-test --json`

### CAABA / Balanix Solutions

Primary goal: partner business growth, lead capture, relationship management, service positioning, and shared reporting.

Recommended portal modules:

- Partner-branded marketing dashboard.
- Lead intake and routing.
- SEO/content performance.
- Google Business Profile if local-service oriented.
- LinkedIn/B2B campaign reporting.
- Proposal/opportunity tracking.

Recommended connectors:

- Website/CMS.
- GA4/Search Console.
- Google Business Profile if applicable.
- LinkedIn Ads.
- Google Ads.
- Email/CRM.

CLI examples:

- `growthctl partner caaba leads export --json`
- `growthctl partner balanix seo report --json`
- `growthctl partner caaba campaign approve --dry-run`

### Hashtag Dentist And store.hashtagdentist

Primary goal: dental brand growth plus ecommerce storefront operations.

Recommended portal modules:

- Ecommerce dashboard.
- Product/catalog sync.
- Inventory and order reporting.
- Promotions and discount governance.
- Email/SMS lifecycle campaigns.
- Reviews and social proof.
- SEO/category performance.
- Conversion funnel and heatmap review.

Recommended connectors:

- Shopify or chosen ecommerce engine.
- Stripe/payments if separate.
- Google Merchant Center when product feed is needed.
- Google Ads and Meta Ads.
- GA4/Search Console.
- Klaviyo/Mailchimp/email.
- Clarity or Hotjar.
- Website host/CDN.

CLI examples:

- `growthctl hashtagdentist products sync --dry-run`
- `growthctl hashtagdentist orders report --json`
- `growthctl hashtagdentist promo create --dry-run`
- `growthctl hashtagdentist seo inspect-product-pages --json`

## Shared API Surface Required

### Control Plane

- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /tenants`
- `POST /tenants`
- `GET /tenants/{tenantId}`
- `PATCH /tenants/{tenantId}`
- `GET /workspaces`
- `POST /workspaces`
- `GET /tools`
- `GET /tools/{toolId}/schema`
- `POST /runs`
- `GET /runs/{runId}`
- `POST /runs/{runId}/cancel`

### Identity, Tenancy, And Access

- `GET /me`
- `GET /memberships`
- `POST /memberships`
- `PATCH /memberships/{id}`
- `DELETE /memberships/{id}`
- `GET /roles`
- `POST /api-keys`
- `GET /api-keys`
- `PATCH /api-keys/{id}/rotate`
- `DELETE /api-keys/{id}`
- `GET /scopes`

### Secrets And Tokens

- `GET /secrets/metadata`
- `POST /secrets/connect`
- `PATCH /secrets/{id}/rotate`
- `POST /secrets/{id}/test`
- `POST /oauth/{provider}/start`
- `GET /oauth/{provider}/callback`
- `POST /oauth/{provider}/refresh`
- `DELETE /oauth/{provider}/disconnect`
- `GET /connectors/{provider}/accounts`
- `POST /connectors/{provider}/accounts/{accountId}/test`

### Approvals And Guardrails

- `POST /guardrail-check`
- `POST /approvals`
- `GET /approvals`
- `PATCH /approvals/{id}/approve`
- `PATCH /approvals/{id}/deny`
- `GET /policy/effective`
- `POST /audit-events`
- `GET /audit-events`

### Leads And CRM

- `POST /leads`
- `GET /leads`
- `GET /leads/{id}`
- `PATCH /leads/{id}`
- `POST /leads/{id}/route`
- `POST /leads/{id}/dedupe`
- `POST /leads/{id}/consent`
- `GET /leads/{id}/timeline`
- `POST /contacts`
- `GET /contacts`
- `PATCH /contacts/{id}`
- `POST /companies`
- `GET /opportunities`
- `POST /opportunities`
- `PATCH /opportunities/{id}`
- `POST /webhooks/forms`
- `POST /webhooks/bookings`
- `POST /webhooks/calls`

### Campaigns And Ads

- `GET /campaigns`
- `POST /campaigns`
- `PATCH /campaigns/{id}`
- `POST /campaigns/{id}/dry-run`
- `POST /campaigns/{id}/publish`
- `POST /campaigns/{id}/pause`
- `GET /campaigns/{id}/performance`
- `GET /ad-accounts`
- `GET /ad-accounts/{id}/campaigns`
- `POST /ad-accounts/{id}/budget-change`
- `POST /offline-conversions`
- `GET /offline-conversions/status`

### SEO And Website

- `GET /sites`
- `POST /sites`
- `GET /sites/{id}/health`
- `POST /sites/{id}/crawl`
- `GET /sites/{id}/search-console/query`
- `POST /sites/{id}/sitemaps/submit`
- `POST /sites/{id}/url-inspection`
- `GET /sites/{id}/pages`
- `GET /sites/{id}/pages/{pageId}/performance`
- `POST /sites/{id}/landing-pages`
- `POST /sites/{id}/landing-pages/{id}/publish`
- `POST /sites/{id}/landing-pages/{id}/rollback`

### Email And Messaging

- `GET /audiences`
- `POST /audiences`
- `POST /contacts/{id}/subscribe`
- `POST /contacts/{id}/unsubscribe`
- `GET /suppression`
- `POST /suppression`
- `GET /email/templates`
- `POST /email/templates`
- `GET /email/campaigns`
- `POST /email/campaigns`
- `POST /email/campaigns/{id}/send-test`
- `POST /email/campaigns/{id}/schedule`
- `POST /email/campaigns/{id}/send`
- `GET /email/campaigns/{id}/performance`

### Ecommerce

- `GET /stores`
- `POST /stores`
- `GET /stores/{id}/products`
- `POST /stores/{id}/products/sync`
- `GET /stores/{id}/orders`
- `GET /stores/{id}/customers`
- `POST /stores/{id}/discounts`
- `GET /stores/{id}/abandoned-carts`
- `POST /stores/{id}/feeds/google-merchant`
- `GET /stores/{id}/performance`

### Infrastructure

- `GET /domains`
- `POST /domains/check`
- `POST /domains/register`
- `POST /domains/renew`
- `GET /dns/zones`
- `POST /dns/records`
- `PATCH /dns/records/{id}`
- `DELETE /dns/records/{id}`
- `POST /ssl/purchase`
- `POST /ssl/renew`
- `GET /hosting`
- `POST /hosting/provision`
- `POST /mail-forwards`
- `GET /m365/subscriptions`

## Secure API Token Strategy

### Non-Negotiable Requirements

- No credentials committed to repos.
- No secrets in CLI args when env or vault injection is available.
- No secrets in logs, audit events, screenshots, support exports, or prompts.
- Tokens are tenant-scoped.
- Tokens are provider-account scoped where possible.
- Store only encrypted tokens or token references.
- Store API key hashes, never plaintext, for internally generated keys.
- Separate production, staging, and test credentials.
- Rotate credentials on schedule and immediately after suspected exposure.
- Fail closed when a token is expired, unscoped, unapproved, or missing metadata.
- Every secret read and live mutation writes an audit event.

### Local Operator Model

Use macOS Keychain for local operator workflows, as described by the CLI Dashboard architecture. The launcher reads secrets only at process spawn time and injects minimal environment variables into the CLI.

### Hosted Platform Model

For hosted multi-user operation, use a production vault:

- Cloud provider KMS plus encrypted database fields, or
- Infisical/1Password/HashiCorp Vault, or
- Platform-native encrypted environment variables only for app-level secrets, not per-tenant OAuth tokens.

Do not rely on macOS Keychain for a hosted multi-tenant portal.

### Provider-Specific Token Notes

Meta:

- Use Meta app review and business permissions.
- Prefer Page access tokens for lead retrieval where required.
- Use system users/business assets for business-managed integrations where appropriate.
- Store ad account IDs, page IDs, pixel IDs, form IDs, and lead IDs.
- Webhook verification and replay protection are mandatory.

Google Ads:

- Requires developer token, OAuth client, refresh/access tokens, manager account/customer IDs, and login customer ID where applicable.
- Use test accounts for destructive or budget-changing workflow tests.
- Treat budget/status changes and conversion uploads as guarded writes.

GA4:

- Use GA4 Data API for reporting.
- Store property IDs per tenant/site.
- Respect quota categories and avoid unnecessarily wide reports.

Google Search Console:

- Use OAuth scopes for webmasters readonly/read-write depending on operations.
- Use read-only for reports and URL inspection where possible.
- Submitting sitemaps and inspection requests are controlled operations.

Google Business Profile:

- Use OAuth with account/location access.
- Some API access may require quota/access approval.
- Store location IDs and review/reply permissions separately.

Mailchimp:

- API keys are sufficient for owned accounts, OAuth is better for client/partner authorization.
- Never expose API keys client-side.
- Separate marketing and transactional email credentials if using both.

Shopify:

- Use custom app/admin access tokens or OAuth app model depending on ownership.
- Scopes must match actual needs: products, orders, customers, discounts, webhooks.
- Token rotation for admin-created custom apps can be disruptive, so design around controlled reauthorization.

Cloudflare:

- Use scoped API tokens, not global API keys.
- Separate DNS edit, analytics read, Workers deploy, R2, and account-level permissions.
- Use token expiration where practical.

Vercel:

- Use bearer tokens for API access.
- Keep project/team/environment variable permissions tightly scoped.
- Prefer Vercel integration model if this becomes a third-party product.

LinkedIn:

- OAuth 2.0 is required.
- Marketing APIs and Lead Sync often require explicit product/program access.
- Use versioned LinkedIn API headers and scope approvals.

TikTok:

- Use TikTok API for Business with OAuth/access-token management.
- Keep advertiser IDs and scopes explicit.

Clarity/Hotjar:

- Use Clarity/Hotjar for behavior analytics, heatmaps, recordings, and event targeting.
- Treat session recordings as privacy-sensitive data.
- Avoid collecting health, finance, or other sensitive user data in recordings without a privacy review.

## Connector Strategy

Build connectors in this order:

1. Synergy connector: domains, DNS, SSL, hosting, M365.
2. Google foundation connector: OAuth, Ads, GA4, Search Console, Business Profile.
3. Meta connector: Ads, Lead Ads, Instagram/Facebook insights, webhooks.
4. Lead/CRM connector: BrokerEngine/Zapier initially for Chorus.
5. Website connector: Vercel and/or Cloudflare.
6. Email connector: Resend for transactional, Mailchimp/Klaviyo for marketing, or internal clone later.
7. Ecommerce connector: Shopify first for `store.hashtagdentist`.
8. Behavior analytics connector: Clarity first, Hotjar if paid features are justified.
9. LinkedIn connector for B2B brands.
10. TikTok connector only when a business has a real TikTok paid/organic strategy.

Each connector must implement:

- `doctor`
- `accounts list`
- `permissions inspect`
- `token status`
- `sync`
- `report`
- `dry-run`
- `webhook verify`
- `webhook replay`
- `audit export`

## Website Monitoring And Hotspot Tracking

Use a layered approach:

- Uptime: synthetic checks for homepage, landing pages, checkout, forms, booking pages, and webhook endpoints.
- Performance: Core Web Vitals, server response time, page weight, JavaScript errors.
- SEO: Search Console queries/pages, sitemap status, URL inspection, index coverage, metadata checks, structured data checks.
- Behavior: Clarity or Hotjar heatmaps, scroll depth, rage clicks, recordings, form abandonment.
- Analytics: GA4 events, conversions, traffic source, landing page, session quality.
- Error monitoring: Sentry for frontend/backend errors.
- Infrastructure: DNS expiry, SSL expiry, hosting status, deployment status, CDN/cache issues.
- Conversion QA: automated form submission tests, booking tests, ecommerce checkout smoke tests, unsubscribe tests.

Website hotspot use cases:

- Detect landing pages with high scroll drop-off before CTA.
- Detect buttons users click that are not actionable.
- Detect form fields that cause abandonment.
- Compare mobile vs desktop behavior.
- Review checkout friction for Hashtag Dentist store.
- Review booking/contact friction for Prova and Chorus.
- Generate weekly "fix list" ranked by revenue or lead impact.

## Email: Mailchimp Or Clone

Short-term recommendation:

- Use Mailchimp or Klaviyo where speed matters and the business needs marketing automation now.
- Use Resend/Postmark for transactional system email.
- Keep unsubscribe/suppression state mirrored in GrowthOps regardless of provider.

Medium-term recommendation:

- Build a lightweight internal email campaign engine only if cross-business needs justify it.
- Do not clone Mailchimp broadly at the start. Build the missing operating layer: consent, templates, approvals, audience sync, suppression, tracking, and reporting.

Internal email engine requirements:

- Audiences and segments.
- Consent source and timestamp.
- Suppression list.
- Unsubscribe endpoint.
- Template approval workflow.
- Test send.
- Scheduling.
- Rate limiting.
- Bounce/complaint processing.
- Per-tenant sending domain.
- DKIM/SPF/DMARC checks.
- Campaign performance reporting.
- Transactional vs marketing separation.

## Exhaustive Use-Case Catalogue

### Setup And Onboarding

- Create tenant.
- Configure business profile.
- Invite users.
- Assign roles.
- Connect provider accounts.
- Verify token scopes.
- Create first website/site record.
- Import existing domains.
- Import contacts/leads.
- Configure suppression list.
- Configure approval rules.
- Configure webhooks.
- Configure tracking IDs.
- Configure source taxonomy.
- Configure campaign naming rules.

### Infrastructure

- Search domain availability.
- Register campaign domain.
- Transfer domain.
- Renew domain.
- Audit expiring domains.
- Create DNS zone.
- Add DNS records.
- Diff DNS records before change.
- Apply DNS changes with dry-run.
- Configure URL forwards.
- Configure mail forwards.
- Issue SSL certificate.
- Renew SSL certificate.
- Audit expiring SSL.
- Provision hosting.
- Check hosting status.
- Unblock hosting firewall IP.
- Configure M365 client/subscriptions.

### Website And Landing Pages

- Create landing page.
- Preview landing page.
- Publish landing page.
- Roll back landing page.
- Attach tracking.
- Submit sitemap.
- Inspect URL indexing.
- Run SEO metadata audit.
- Run accessibility smoke check.
- Run mobile conversion check.
- Test form submission.
- Test booking flow.
- Test checkout flow.
- Check page speed.
- Check broken links.
- Check analytics event firing.

### Ads And Paid Media

- List ad accounts.
- Inspect campaign budgets.
- Inspect campaign status.
- Create campaign draft.
- Dry-run campaign publish.
- Pause campaign.
- Resume campaign.
- Change budget with approval.
- Export performance report.
- Retrieve lead form leads.
- Verify lead webhook.
- Upload offline conversions.
- Sync CRM outcomes back to ad platforms.
- Detect campaigns with spend but no leads.
- Detect leads with no CRM card.
- Detect high CPL campaigns.
- Detect high lead volume but low quality.

### SEO And Local

- Query Search Console performance.
- Track branded vs non-branded queries.
- Track landing page impressions and clicks.
- Track index coverage.
- Submit sitemap.
- Inspect priority URLs.
- Track Google Business Profile views/actions.
- List and respond to reviews where approved.
- Track local keywords.
- Identify pages needing refresh.
- Identify missing schema/metadata.

### Leads And CRM

- Receive web lead.
- Receive Meta lead.
- Receive Google lead form lead.
- Receive booking.
- Receive phone call event.
- Validate lead schema.
- Normalize phone/email.
- Dedupe lead.
- Store consent.
- Route to owner.
- Create CRM card/deal.
- Create first-response task.
- Send internal alert.
- Send compliant confirmation.
- Sync stage changes.
- Record lost reason.
- Record qualified outcome.
- Record sale/settlement/order.
- Export source-quality report.

### Email And Messaging

- Import audience.
- Segment audience.
- Check consent.
- Check suppression.
- Create campaign draft.
- Approve campaign content.
- Send test.
- Schedule campaign.
- Send campaign.
- Pause scheduled send.
- Process unsubscribe.
- Process bounce.
- Process complaint.
- Report opens/clicks/conversions.
- Trigger lifecycle sequence.
- Sync ecommerce abandoned cart.

### Ecommerce

- Connect store.
- Sync products.
- Sync collections/categories.
- Sync customers.
- Sync orders.
- Sync refunds.
- Create discount.
- Schedule promotion.
- Publish product feed.
- Monitor checkout conversion.
- Monitor abandoned carts.
- Report revenue by source/campaign.
- Report product page SEO.
- Report inventory/fulfilment status if supported.

### Website Behavior And CRO

- Create heatmap.
- Review top recordings.
- Track rage clicks.
- Track dead clicks.
- Track scroll depth.
- Track form abandonment.
- Track checkout abandonment.
- Compare device segments.
- Generate page-fix backlog.
- Mark issue fixed.
- Re-test conversion path.

### Governance And Security

- Request approval.
- Approve live write.
- Deny live write.
- Audit token read.
- Rotate token.
- Revoke connector.
- Inspect effective scopes.
- Review failed guardrails.
- Export audit logs.
- Run compliance review.
- Run privacy/DSAR export.
- Verify no secrets in logs.
- Verify webhook signatures.
- Verify provider permissions.

### Reporting

- Weekly executive dashboard.
- Business-by-business scorecard.
- Campaign profitability.
- Lead quality by source.
- Website health.
- SEO opportunities.
- Email performance.
- Ecommerce revenue.
- Connector health.
- Token expiry.
- Open approvals.
- Failed jobs.
- Audit exceptions.

## Portal Reuse Decision: Bord.Room Backend Or Separate Platform

Recommended path:

- Reuse Bord.Room patterns, not necessarily the live Bord.Room product database.
- Build GrowthOps as a separate app/service with the same multi-tenant principles.
- Share packages for auth/RBAC/audit/connectors if code ownership permits.
- Avoid coupling restaurant operations data to unrelated finance/dental/partner marketing tenants.

When to run on Bord.Room infrastructure:

- Good for a prototype if tenant isolation, billing, and admin UI are already usable.
- Good for internal-only use while proving workflows.

When to split:

- Required for commercializing GrowthOps outside hospitality.
- Required if Hashtag Dentist ecommerce, Chorus finance compliance, and partner/client marketing data need distinct data retention and risk controls.
- Required if the portal will become a sellable marketing operations product.

## Implementation Roadmap

### Phase 0: Decisions And Safety Baseline

- Confirm commercial licensing/IP position for Synergy, ADG, dashboard, and any Bord.Room reuse.
- Choose hosted vs local-only operating model.
- Decide whether GrowthOps is internal-only or a client-facing product.
- Confirm initial tenants: Prova, Chorus, Bord.Room, Hashtag Dentist.
- Create canonical tenant, connector, secret, audit, lead, campaign, website, and report schemas.

### Phase 1: Infrastructure And Control Plane MVP

- Implement GrowthOps API skeleton.
- Implement tenant/RBAC.
- Implement audit events.
- Implement approval model.
- Implement secret metadata.
- Wrap Synergy as first connector.
- Build `growthctl doctor`, `connectors list`, `infra domain-check`, `infra dns-diff`.
- Build portal shell with tenant switcher, connector health, audit feed, approvals.

### Phase 2: Lead And Website MVP

- Implement website/site model.
- Implement GA4/Search Console connector.
- Implement Meta/Google lead webhook ingestion.
- Implement canonical lead API.
- Implement BrokerEngine/Zapier connector for Chorus.
- Implement form and landing-page QA commands.
- Build lead command centre.

### Phase 3: Paid Media And Reporting

- Implement Google Ads reporting and conversion upload.
- Implement Meta Ads reporting and lead retrieval.
- Add weekly scorecards.
- Add campaign approval and budget-change dry-runs.
- Add source-quality and offline conversion loops.

### Phase 4: Ecommerce And Email

- Implement Shopify connector for `store.hashtagdentist`.
- Implement Mailchimp/Klaviyo connector or internal campaign engine.
- Add abandoned cart and promotion reporting.
- Add ecommerce SEO and product feed checks.

### Phase 5: Scale And Productization

- Add LinkedIn/TikTok when business cases justify them.
- Add partner portals for CAABA/Balanix.
- Harden rate limits, quotas, retries, and idempotency.
- Publish OpenAPI and CLI docs.
- Add billing if selling to external clients.

## Key Risks

- Scope creep: "all social media, ads, SEO, hosting, ecommerce, email" can become a huge product. Start with the connectors that reduce immediate leakage.
- Compliance: Chorus Finance and dental ecommerce need stronger privacy, consent, claims, and data retention review than a restaurant campaign.
- Token fragility: OAuth and app review can block integrations if not planned early.
- Multi-tenancy: never mix business data, tokens, audit logs, or reporting views.
- Licensing: several local repos use noncommercial/source-available licensing language; resolve rights before commercialization.
- Provider API limits: ad, analytics, and search APIs have quotas and access approval requirements.
- Recording privacy: heatmaps/session recordings can capture sensitive input if not configured carefully.
- CRM confusion: do not accidentally build a half-CRM when a command centre beside existing systems is enough.

## Recommended MVP

MVP tenants:

- Chorus Finance.
- Prova Pizzeria.
- Bord.Room.
- Hashtag Dentist store prep.

MVP connectors:

- Synergy.
- Google Search Console/GA4.
- Meta Lead Ads and Meta Ads reporting.
- Google Ads reporting.
- BrokerEngine via Zapier/webhooks.
- Vercel or Cloudflare.
- Mailchimp or Resend depending on first email need.

MVP portal:

- Tenant switcher.
- Connector health.
- Secret/token status.
- Approval queue.
- Audit feed.
- Lead command centre.
- Website health dashboard.
- Campaign scorecard.

MVP CLI:

- `growthctl doctor`
- `growthctl connectors list`
- `growthctl secrets status`
- `growthctl audit tail`
- `growthctl infra domain-check`
- `growthctl infra landing-stack dry-run`
- `growthctl leads test-submit`
- `growthctl leads sync-status`
- `growthctl seo report`
- `growthctl ads report`
- `growthctl conversions upload --dry-run`

## Primary External Sources

- Meta Marketing API and Lead Ads: https://developers.facebook.com/documentation/ads-commerce/marketing-api and https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads
- Meta Lead Ads webhooks: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration
- Google Ads API: https://developers.google.com/google-ads/api
- Google Ads OAuth: https://developers.google.com/google-ads/api/docs/oauth/overview
- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Google Search Console URL Inspection API: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Google Business Profile APIs: https://developers.google.com/my-business
- Google Business Profile Performance API: https://developers.google.com/my-business/reference/performance/rest
- Mailchimp Marketing API: https://mailchimp.com/developer/marketing/guides/quick-start/
- Mailchimp API key guidance: https://mailchimp.com/help/about-api-keys/
- Shopify Admin API: https://shopify.dev/docs/api/admin-rest
- Shopify access tokens: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin
- Shopify API scopes: https://shopify.dev/docs/api/usage/access-scopes
- Cloudflare API tokens: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Cloudflare token permissions: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Vercel REST API: https://vercel.com/docs/rest-api
- Vercel environment variables: https://vercel.com/docs/environment-variables
- LinkedIn Marketing API: https://learn.microsoft.com/en-us/linkedin/marketing/
- LinkedIn OAuth: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- LinkedIn Lead Sync: https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync
- TikTok API for Business: https://business-api.tiktok.com/portal/docs
- TikTok access token management: https://developers.tiktok.com/doc/oauth-user-access-token-management
- Microsoft Clarity docs: https://learn.microsoft.com/en-us/clarity/
- Microsoft Clarity FAQ: https://learn.microsoft.com/en-us/clarity/faq
- Hotjar API reference: https://help.hotjar.com/hc/en-us/articles/36820005914001-Hotjar-API-Reference

## Local Sources Reviewed

- `/Users/zach/Documents/synergywholesale`
- `/Users/zach/Documents/A_Marketing_Chorus/chorus-finance-lead-gen-guide.html`
- `/Users/zach/Documents/A_Marketing_Prova/chorus_lead_generation_guide.html`
- `/Users/zach/Documents/agentic-cli-dashboard`
- `/Users/zach/Development/bord.roomv4.1`
- `/Users/zach/Documents/Claude/Projects/Prova Finances/Prova Loan Report.html`
- `/Users/zach/Documents/Prova Data/document-classifier-training-guide.html`
