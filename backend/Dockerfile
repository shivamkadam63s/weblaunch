FROM node:20-alpine
RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
RUN mkdir -p logs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3   CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "src/index.js"]
