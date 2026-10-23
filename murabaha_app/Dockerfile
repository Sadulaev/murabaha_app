FROM node:20-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
# Empty value: the browser calls /api on the same host. Host nginx proxies it.
ENV NEXT_PUBLIC_API_URL=""

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build \
  && if grep -R -q "localhost:3001" /app/out; then \
       echo "production bundle still points at localhost:3001"; \
       exit 1; \
     fi

FROM alpine:3.20

COPY --from=build /app/out /app/out
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
