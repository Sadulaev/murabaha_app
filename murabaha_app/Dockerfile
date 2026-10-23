FROM node:20-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
# Empty value: the browser calls /api on the same host. nginx proxies it.
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

FROM nginx:1.27-alpine

RUN apk add --no-cache certbot ca-certificates wget \
  && mkdir -p /etc/nginx/templates /etc/nginx/snippets /var/www/certbot \
  && rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/out /usr/share/nginx/html
COPY nginx/http.conf /etc/nginx/templates/http.conf
COPY nginx/https.conf /etc/nginx/templates/https.conf
COPY nginx/app.conf /etc/nginx/snippets/app.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
