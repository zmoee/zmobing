FROM node:20-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_APP_VERSION=本地开发版
ARG VITE_RELEASE_TIME=未发布
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_RELEASE_TIME=$VITE_RELEASE_TIME
RUN npx vite build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
