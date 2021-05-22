FROM node:14.16.0

WORKDIR /app

COPY ./package.json ./

RUN npm install
RUN npm install -g pm2 cross-env sequelize-cli

COPY ./ ./

CMD ["sudo", "npm", "start"]