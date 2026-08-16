FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=8787
EXPOSE 8787
CMD ["npm","start"]
