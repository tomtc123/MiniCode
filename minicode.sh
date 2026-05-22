#!/bin/bash
node --import tsx "$(dirname "$0")/src/index.tsx" "$@"
