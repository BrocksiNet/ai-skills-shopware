# 2024-11-01 Event Flow Pattern

## Context

Shopware core processes thousands of events per request. We needed a consistent pattern for event dispatching.

## Decision

We use synchronous event dispatching for all core events to maintain order and simplicity.

## Consequences

Sequential behavior is easier to test but limits concurrency options.

## Status

Accepted in 6.7.0.0
