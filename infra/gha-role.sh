#!/bin/bash

if [[ $1 == deploy ]]; then
    set -x
    npx cdk --app "npx ts-node bin/gha-role.ts" deploy
elif [[ $1 == destroy ]]; then
    set -x
    npx cdk --app "npx ts-node bin/gha-role.ts" destroy
else
    echo "Usage: $0 deploy|destroy"
fi