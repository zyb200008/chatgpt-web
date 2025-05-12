# build front-end
FROM node:22-alpine AS frontend

ARG GIT_COMMIT_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ARG RELEASE_VERSION=v0.0.0

ENV VITE_GIT_COMMIT_HASH $GIT_COMMIT_HASH
ENV VITE_RELEASE_VERSION $RELEASE_VERSION

RUN npm install pnpm@8 -g

WORKDIR /app

COPY ./package.json /app

COPY ./pnpm-lock.yaml /app

RUN pnpm install

COPY . /app

RUN pnpm run build

# build backend
FROM node:22-alpine AS backend

RUN npm install pnpm@8 -g

WORKDIR /app

COPY /service/package.json /app

COPY /service/pnpm-lock.yaml /app

RUN pnpm install

COPY /service /app

RUN pnpm build

# service
FROM node:22-alpine

RUN apk add --no-cache tini

RUN npm install pnpm@8 -g

WORKDIR /app

COPY /service/package.json /app

COPY /service/pnpm-lock.yaml /app

RUN pnpm install --production && rm -rf /root/.npm /root/.pnpm-store /usr/local/share/.cache /tmp/*

COPY /service /app

COPY --from=frontend /app/dist /app/public

COPY --from=backend /app/build /app/build

EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "--import", "tsx/esm", "./build/index.js"]
