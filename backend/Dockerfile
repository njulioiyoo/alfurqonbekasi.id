FROM node:20-alpine AS build

WORKDIR /app

COPY www/package.json www/package-lock.json* ./
RUN npm install

COPY www/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY www/package.json www/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]
