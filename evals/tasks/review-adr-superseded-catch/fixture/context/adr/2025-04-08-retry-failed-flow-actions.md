---
title: Retry failed flow actions
date: 2025-04-08
area: business-ops
tags: [flow, message-queue, retry]
---

## Context

Flow actions call mail servers, webhooks and apps. A short outage of one of
them made the whole flow fail, and merchants had to replay orders by hand.

## Decision

A flow action that throws is dispatched again through the message queue. It is
retried three times with an exponential delay, starting at 10 seconds. After the
third failure, the error is logged and the flow continues with the next action.

## Consequences

* Flow actions must be idempotent, because they can run more than once.
* Apps that receive webhooks from flow actions can see the same event twice.
