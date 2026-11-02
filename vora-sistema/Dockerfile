FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY server ./server
COPY public ./public
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data TZ=America/Maceio
RUN apk add --no-cache tzdata && mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:3000/api/saude || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
