# Use lightweight Node.js alpine image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY src/ ./src/

# Expose port
EXPOSE 8080

# Command to run the app
CMD [ "node", "src/index.js" ]