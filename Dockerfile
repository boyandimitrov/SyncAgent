# Use an official Node.js runtime as the base image
FROM node:16

# Set a default value for environment variables (can be overridden during build)
ARG NODE_ENV=production

# Set environment variables based on build arguments
ENV NODE_ENV=$NODE_ENV

# Create and set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code to the working directory
COPY . .

# Command to run your application (can be overridden during container startup)
CMD ["node", "index.js"]
