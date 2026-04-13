FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_GEMINI_API_KEY=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN test -n "$VITE_API_BASE_URL"
RUN npm run build:staging

FROM nginx:1.29-alpine
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
