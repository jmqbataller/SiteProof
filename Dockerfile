FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package*.json ./
RUN npm install --omit=dev=false && npx playwright install --with-deps chromium
COPY . .
ENV PORT=8787
EXPOSE 8787
CMD ["npm", "start"]
