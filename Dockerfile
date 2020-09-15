FROM node:12-alpine

ARG NPM_TOKEN

RUN adduser -D -u 1001 op_server
USER 1001

WORKDIR /home/op_server

ENV TZ="Europe/London" \
    NODE_ENV=production

COPY package.json package-lock.json docker/.npmrc ./

RUN npm ci

COPY . .

USER 0
RUN chown -R op_server /home/op_server
USER 1001

EXPOSE 8080
CMD [ "node", "server.js" ]
