FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/bureaucracy-plusplus/package.json apps/bureaucracy-plusplus/package.json
COPY apps/democracy-plusplus/package.json apps/democracy-plusplus/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY apps/bureaucracy-plusplus apps/bureaucracy-plusplus
COPY packages/shared-types packages/shared-types

RUN npm run build:shared && npm run build -w bureaucracy-plusplus

WORKDIR /app/apps/bureaucracy-plusplus

ENV PORT=8080

CMD ["node", "dist/index.js"]
