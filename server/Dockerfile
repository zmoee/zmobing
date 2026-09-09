FROM node:20-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY prisma.config.ts nest-cli.json tsconfig*.json ./
COPY src ./src
ENV DATABASE_URL=mysql://zmobl:build-only@db:3306/zmobl
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
