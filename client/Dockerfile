# Base image
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Bundle app source
COPY . .

# Build the app
RUN pnpm build

# Expose port and start app
EXPOSE 3000
CMD [ "pnpm", "start" ]