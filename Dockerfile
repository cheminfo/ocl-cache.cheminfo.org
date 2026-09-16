FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

EXPOSE 20822

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
