FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Set an empty default; the hosting panel should set AUTH_STATE to a real value
ENV AUTH_STATE=""

EXPOSE 8080
CMD [ "node", "v1/index.js" ]
