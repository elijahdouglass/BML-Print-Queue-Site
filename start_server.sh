#!/bin/bash

echo "Starting Print Queue Site..."

PROJECT_DIR=~/BML-Print-Queue-Site

echo "Stopping existing node processes..."
pkill node 2>/dev/null

echo "Starting backend..."
cd $PROJECT_DIR/src/backend || exit
npm run dev &

echo "Starting frontend..."
cd $PROJECT_DIR/src/frontend || exit
npm run dev &

echo "Servers started."

wait