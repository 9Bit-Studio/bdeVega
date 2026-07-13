FROM node:22-bookworm-slim

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV PORT=4001
ENV HOST=0.0.0.0

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter verify-runner exec playwright install --with-deps chromium
RUN pnpm --filter verify-runner build

EXPOSE 4001
CMD ["node", "services/verify-runner/dist/server.js"]
