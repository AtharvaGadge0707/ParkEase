
FROM node:24-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY . .

EXPOSE 5000

CMD ["npm", "start"]

