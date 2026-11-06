ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE}

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    KNOWLEDGE_DIR=/app/knowledge \
    CACHE_DIR=/app/.cache

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY public ./public
# Example knowledge base; mount your own folder over /app/knowledge to use different data.
COPY knowledge ./knowledge
RUN mkdir -p /app/.cache && chown node:node /app/.cache

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
