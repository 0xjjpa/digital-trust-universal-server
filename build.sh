#!/bin/sh
set -eux

if [ $# -eq 0 ]
  then
    exit "No auth supplied"
fi

IMAGE_GITHUB="docker.pkg.github.com/gruposantander/universal-server/universal-server"
TAG=latest
NPM_TOKEN="$1"

docker build -t ${IMAGE_GITHUB}:${TAG} \
  --build-arg NPM_TOKEN=${NPM_TOKEN} .