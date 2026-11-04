#!/usr/bin/env bash
exec node "$(dirname "$0")/../../../tools/bin/grade.ts" discovery-app-plan
