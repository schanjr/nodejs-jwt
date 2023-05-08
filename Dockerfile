FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install -g yarn
RUN yarn install

COPY . .

CMD ["yarn", "start"]
