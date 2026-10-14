FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY src ./src

RUN pnpm build

EXPOSE 3001

CMD ["pnpm", "dev"]
