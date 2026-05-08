FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY server.js .
COPY migrate.js .
COPY update-message.js .
COPY migrations ./migrations

EXPOSE 8080

USER node

CMD ["node", "server.js"]
