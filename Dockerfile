# Install node v10
FROM node:14

# Set the workdir /var/www/myapp
WORKDIR /var/www/leaderboard

# Copy the package.json to workdir
COPY package.json ./

# Run npm install - install the npm dependencies
RUN npm install

# Copy application source
COPY . .

# Expose application port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]