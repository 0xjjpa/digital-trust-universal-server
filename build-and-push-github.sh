#!/bin/sh
set -eux

if [ $# -eq 0 ]
  then
    exit "No auth supplied"
fi

REGISTRY_EXTERNAL="https://registry.pro-eu-west-1.openshift.com"
IMAGE_EXTERNAL="registry.pro-eu-west-1.openshift.com/verifiedid-pro/op-server"
IMAGE_GITHUB="docker.pkg.github.com/gruposantander/op-server/op-server:latest"
TAG=beta
USER_NAME="$1"
NPM_TOKEN="$2"

docker login docker.pkg.github.com -u ${USER_NAME} -p ${NPM_TOKEN}
docker build -t ${IMAGE_EXTERNAL}:${TAG} \
  --build-arg NPM_TOKEN=${NPM_TOKEN} .
docker tag ${IMAGE_EXTERNAL}:${TAG} ${IMAGE_GITHUB}

docker push ${IMAGE_GITHUB}
