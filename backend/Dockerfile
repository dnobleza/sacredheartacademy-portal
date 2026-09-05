# Backend image for the Sacred Heart Academy portal API.
# Build context is the backend/ folder.

FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies first so this layer is cached until package files change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# The one-off Super Admin seeder, run with `npm run seed:admin` inside the
# container. See database/seed-admin.js for the environment variables it needs.
COPY database/seed-admin.js ./database/seed-admin.js

# The app writes winston logs to src/logs, which is not in the repo.
# Create it and hand ownership to the unprivileged node user.
RUN mkdir -p src/logs && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
