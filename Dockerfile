FROM node:22.22.2-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
# Public build settings only. Unset switches preserve official logos by default.
ARG VITE_OFFICIAL_LOGOS
ARG VITE_DISABLED_OFFICIAL_LOGO_SOURCES
# This image always serves the calendar relay on the site's own origin.
ENV VITE_CALENDAR_RELAY_URL=""
RUN pnpm -r build

FROM node:22.22.2-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/apps/web/server/dist ./apps/web/server/dist
USER node
CMD ["node", "apps/web/server/dist/index.mjs"]
