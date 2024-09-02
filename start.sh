#!/bin/bash

# Check if node_modules directory exists
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing dependencies..."
  npm install
fi

# Clear the screen
clear

# Display multiline message
echo "Welcome to consumerfinance.gov Rules Text extraction Tool."
echo "The tool is created by Pimatrix System, LLC"
echo "All Rights are reserved by Pimatrix System, LLC"
echo "For any query: Contact@pimatrix.in"

# Run node script
node ./src/main.js
