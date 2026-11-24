# 2024-12-10 Caching Strategy

## Context

We need a consistent caching approach for core operations.

## Decision

We use in-memory caching with Redis for distributed scenarios.

## Consequences

This provides good performance and consistency across instances.

## Status

Accepted in 6.8.0.0 (not yet shipped)
